"use client";

import { useState, useEffect } from "react";
import { FIELD_SPECS, EntryType } from "@/lib/cards/prompts";

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

export default function SettingsPage() {
  const [settings, setSettings] = useState<PromptSettingsResponse | null>(null);
  const [systemDraft, setSystemDraft] = useState("");
  const [fieldDrafts, setFieldDrafts] = useState<Record<EntryType, Record<string, string>>>({
    word: {}, concept: {}, reference: {},
  });
  const [savingSystem, setSavingSystem] = useState(false);
  const [savingType, setSavingType] = useState<EntryType | null>(null);
  const [confirmingReset, setConfirmingReset] = useState<"system" | EntryType | null>(null);
  const [resetting, setResetting] = useState(false);

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
    setSavingSystem(true);
    await fetch("/api/settings/prompts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-pin": getPin() },
      body: JSON.stringify({ system: systemDraft }),
    });
    await load();
    setSavingSystem(false);
  }

  async function saveType(type: EntryType) {
    setSavingType(type);
    await fetch("/api/settings/prompts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-pin": getPin() },
      body: JSON.stringify({ [type]: fieldDrafts[type] }),
    });
    await load();
    setSavingType(null);
  }

  async function confirmReset() {
    if (!confirmingReset) return;
    setResetting(true);
    const body = confirmingReset === "system"
      ? { scope: "system" }
      : { scope: "fields", entryType: confirmingReset };
    await fetch("/api/settings/prompts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "x-pin": getPin() },
      body: JSON.stringify(body),
    });
    await load();
    setResetting(false);
    setConfirmingReset(null);
  }

  if (!settings) return <div className="py-8 text-center" style={{ color: "var(--text-muted)" }}>Loading…</div>;

  const systemCustomized = settings.system.custom !== null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 pb-2" style={{ borderBottom: "1px solid var(--border)" }}>
        <h1 className="font-semibold tracking-tight" style={{ color: "var(--text)", fontSize: "clamp(1.6rem, 6vw, 2.2rem)" }}>
          Prompt settings
        </h1>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          These are the global defaults used whenever you add a word, concept, or reference. You can also override them for a single add from the Add page.
        </p>
      </div>

      {/* System prompt */}
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            System prompt (shared across types)
          </span>
          {systemCustomized && (
            <span className="text-xs" style={{ color: "var(--accent-fg)" }}>customized</span>
          )}
        </div>
        <div className="px-4 pb-4 flex flex-col gap-3">
          <textarea
            value={systemDraft}
            onChange={(e) => setSystemDraft(e.target.value)}
            rows={4}
            maxLength={1000}
            className="input-field resize-none text-sm"
          />
          {confirmingReset === "system" ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                {resetting ? "Resetting…" : "Reset to built-in default?"}
              </span>
              <div className="flex gap-4 shrink-0">
                <button onClick={() => setConfirmingReset(null)} disabled={resetting} className="text-sm" style={{ color: "var(--text-muted)" }}>Cancel</button>
                <button onClick={confirmReset} disabled={resetting} className="text-sm font-medium" style={{ color: "#f87171" }}>Confirm</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <button onClick={saveSystem} disabled={savingSystem} className="btn-primary" style={{ width: "auto", paddingLeft: "1rem", paddingRight: "1rem" }}>
                {savingSystem ? "Saving…" : "Save"}
              </button>
              {systemCustomized && (
                <button onClick={() => setConfirmingReset("system")} className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Reset to default
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Per entry-type field instructions */}
      {ENTRY_TYPES.map((type) => {
        const customized = FIELD_SPECS[type].some((spec) => settings[type][spec.key]?.custom !== null);
        return (
          <div key={type} className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                {ENTRY_LABEL[type]} fields
              </span>
              {customized && (
                <span className="text-xs" style={{ color: "var(--accent-fg)" }}>customized</span>
              )}
            </div>
            <div className="px-4 pb-4 flex flex-col gap-3">
              {FIELD_SPECS[type].map((spec) => (
                <div key={spec.key} className="flex flex-col gap-1">
                  <label className="text-xs" style={{ color: "var(--text-muted)" }}>{spec.label}</label>
                  <textarea
                    value={fieldDrafts[type][spec.key] ?? ""}
                    onChange={(e) => setFieldDrafts((prev) => ({
                      ...prev,
                      [type]: { ...prev[type], [spec.key]: e.target.value },
                    }))}
                    rows={2}
                    maxLength={300}
                    className="input-field resize-none text-sm"
                  />
                </div>
              ))}
              {confirmingReset === type ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                    {resetting ? "Resetting…" : `Reset all ${ENTRY_LABEL[type].toLowerCase()} fields to default?`}
                  </span>
                  <div className="flex gap-4 shrink-0">
                    <button onClick={() => setConfirmingReset(null)} disabled={resetting} className="text-sm" style={{ color: "var(--text-muted)" }}>Cancel</button>
                    <button onClick={confirmReset} disabled={resetting} className="text-sm font-medium" style={{ color: "#f87171" }}>Confirm</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <button onClick={() => saveType(type)} disabled={savingType === type} className="btn-primary" style={{ width: "auto", paddingLeft: "1rem", paddingRight: "1rem" }}>
                    {savingType === type ? "Saving…" : "Save"}
                  </button>
                  {customized && (
                    <button onClick={() => setConfirmingReset(type)} className="text-sm" style={{ color: "var(--text-muted)" }}>
                      Reset to default
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
