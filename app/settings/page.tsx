"use client";

import { useState, useEffect } from "react";
import { FIELD_SPECS, EntryType } from "@/lib/cards/prompts";
import CollapsibleField from "@/components/CollapsibleField";

function getPin(): string {
  return localStorage.getItem("vb_pin") ?? "";
}

interface FieldSetting {
  label: string;
  default: string;
  custom: string | null;
}

interface PromptSettingsResponse {
  system: { default: string; custom: string | null };
  word: Record<string, FieldSetting>;
  concept: Record<string, FieldSetting>;
  reference: Record<string, FieldSetting>;
}

const ENTRY_TYPES: EntryType[] = ["word", "concept", "reference"];
const ENTRY_LABEL: Record<EntryType, string> = { word: "Word", concept: "Concept", reference: "Reference" };

function SaveResetFooter({
  onSave,
  onReset,
  saving,
  resetting,
  customized,
}: {
  onSave: () => void;
  onReset: () => void;
  saving: boolean;
  resetting: boolean;
  customized: boolean;
}) {
  const disabled = saving || resetting;
  return (
    <div className="flex items-center justify-between">
      <button
        type="button"
        onClick={onSave}
        disabled={disabled}
        className="text-xs font-medium"
        style={{ color: "var(--accent-fg)" }}
      >
        {saving ? "Saving…" : "Save"}
      </button>
      {customized && (
        <button
          type="button"
          onClick={onReset}
          disabled={disabled}
          className="text-xs"
          style={{ color: "var(--text-muted)" }}
        >
          {resetting ? "Resetting…" : "Reset to default"}
        </button>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<PromptSettingsResponse | null>(null);
  const [systemDraft, setSystemDraft] = useState("");
  const [fieldDrafts, setFieldDrafts] = useState<Record<EntryType, Record<string, string>>>({
    word: {}, concept: {}, reference: {},
  });
  const [systemBusy, setSystemBusy] = useState<"save" | "reset" | null>(null);
  const [busyField, setBusyField] = useState<string | null>(null); // "<type>:<key>:save" | "...:reset"

  async function load() {
    const res = await fetch("/api/settings/prompts", { headers: { "x-pin": getPin() } });
    if (!res.ok) return;
    const data: PromptSettingsResponse = await res.json();
    setSettings(data);
    setSystemDraft(data.system.custom ?? data.system.default);
    const drafts = { word: {}, concept: {}, reference: {} } as Record<EntryType, Record<string, string>>;
    for (const type of ENTRY_TYPES) {
      for (const spec of FIELD_SPECS[type]) {
        drafts[type][spec.key] = data[type][spec.key]?.custom ?? data[type][spec.key]?.default ?? spec.instruction;
      }
    }
    setFieldDrafts(drafts);
  }

  useEffect(() => {
    load();
  }, []);

  async function saveSystem() {
    setSystemBusy("save");
    await fetch("/api/settings/prompts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-pin": getPin() },
      body: JSON.stringify({ system: systemDraft }),
    });
    await load();
    setSystemBusy(null);
  }

  async function resetSystem() {
    setSystemBusy("reset");
    await fetch("/api/settings/prompts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "x-pin": getPin() },
      body: JSON.stringify({ scope: "system" }),
    });
    await load();
    setSystemBusy(null);
  }

  async function saveField(type: EntryType, key: string) {
    setBusyField(`${type}:${key}:save`);
    await fetch("/api/settings/prompts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-pin": getPin() },
      body: JSON.stringify({ [type]: { [key]: fieldDrafts[type][key] } }),
    });
    await load();
    setBusyField(null);
  }

  async function resetField(type: EntryType, key: string) {
    setBusyField(`${type}:${key}:reset`);
    await fetch("/api/settings/prompts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "x-pin": getPin() },
      body: JSON.stringify({ scope: "fields", entryType: type, field: key }),
    });
    await load();
    setBusyField(null);
  }

  if (!settings) return <div className="py-8 text-center" style={{ color: "var(--text-muted)" }}>Loading…</div>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 pb-2" style={{ borderBottom: "1px solid var(--border)" }}>
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--text)" }}>Prompt settings</h1>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Global defaults used whenever you add a word, concept, or reference. Override any single add from the Add page instead.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>System prompt</h2>
        <CollapsibleField
          label="Shared across all types"
          badge={settings.system.custom !== null ? "customized" : undefined}
          value={systemDraft}
          onChange={setSystemDraft}
          maxLength={1000}
          rows={4}
          footer={
            <SaveResetFooter
              onSave={saveSystem}
              onReset={resetSystem}
              saving={systemBusy === "save"}
              resetting={systemBusy === "reset"}
              customized={settings.system.custom !== null}
            />
          }
        />
      </div>

      {ENTRY_TYPES.map((type) => (
        <div key={type} className="flex flex-col gap-2">
          <h2 className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            {ENTRY_LABEL[type]}
          </h2>
          {FIELD_SPECS[type].map((spec) => {
            const customized = settings[type][spec.key]?.custom !== null;
            return (
              <CollapsibleField
                key={spec.key}
                label={spec.label}
                badge={customized ? "customized" : undefined}
                value={fieldDrafts[type][spec.key] ?? ""}
                onChange={(v) => setFieldDrafts((prev) => ({ ...prev, [type]: { ...prev[type], [spec.key]: v } }))}
                maxLength={300}
                rows={3}
                footer={
                  <SaveResetFooter
                    onSave={() => saveField(type, spec.key)}
                    onReset={() => resetField(type, spec.key)}
                    saving={busyField === `${type}:${spec.key}:save`}
                    resetting={busyField === `${type}:${spec.key}:reset`}
                    customized={customized}
                  />
                }
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
