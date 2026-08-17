"use client";

import { useState, useEffect } from "react";
import { FIELD_SPECS, EntryType } from "@/lib/cards/prompts";
import PromptFieldRow from "@/components/PromptFieldRow";
import PromptEditorModal from "@/components/PromptEditorModal";

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

type OpenField = { type: "system" } | { type: EntryType; key: string };

const ENTRY_TYPES: EntryType[] = ["word", "concept", "reference"];
const ENTRY_LABEL: Record<EntryType, string> = { word: "Word", concept: "Concept", reference: "Reference" };

function PromptSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="px-4 pt-3 pb-2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{title}</span>
      </div>
      <ul className="flex flex-col divide-y" style={{ borderColor: "var(--border-subtle)" }}>
        {children}
      </ul>
    </div>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<PromptSettingsResponse | null>(null);
  const [openField, setOpenField] = useState<OpenField | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/settings/prompts", { headers: { "x-pin": getPin() } });
    if (res.ok) setSettings(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave(value: string) {
    if (!openField) return;
    setBusy(true);
    await fetch("/api/settings/prompts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-pin": getPin() },
      body: JSON.stringify(
        openField.type === "system"
          ? { system: value }
          : { [openField.type]: { [openField.key]: value } }
      ),
    });
    await load();
    setBusy(false);
    setOpenField(null);
  }

  async function handleReset() {
    if (!openField) return;
    setBusy(true);
    await fetch("/api/settings/prompts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "x-pin": getPin() },
      body: JSON.stringify(
        openField.type === "system"
          ? { scope: "system" }
          : { scope: "fields", entryType: openField.type, field: openField.key }
      ),
    });
    await load();
    setBusy(false);
    setOpenField(null);
  }

  if (!settings) return <div className="py-8 text-center" style={{ color: "var(--text-muted)" }}>Loading…</div>;

  // Derive what the editor modal needs from `settings` + `openField`
  const editing = openField
    ? openField.type === "system"
      ? {
          label: "System prompt",
          value: settings.system.custom ?? settings.system.default,
          maxLength: 1000,
          customized: settings.system.custom !== null,
        }
      : {
          label: settings[openField.type][openField.key]?.label ?? openField.key,
          value: settings[openField.type][openField.key]?.custom ?? settings[openField.type][openField.key]?.default ?? "",
          maxLength: 300,
          customized: settings[openField.type][openField.key]?.custom !== null,
        }
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 pb-2" style={{ borderBottom: "1px solid var(--border)" }}>
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--text)" }}>Prompt settings</h1>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Global defaults used whenever you add a word, concept, or reference. Override any single add from the Add page instead.
        </p>
      </div>

      <PromptSection title="System prompt">
        <PromptFieldRow label="Shared across all types" onClick={() => setOpenField({ type: "system" })} />
      </PromptSection>

      {ENTRY_TYPES.map((type) => (
        <PromptSection key={type} title={ENTRY_LABEL[type]}>
          {FIELD_SPECS[type].map((spec) => (
            <PromptFieldRow
              key={spec.key}
              label={spec.label}
              onClick={() => setOpenField({ type, key: spec.key })}
            />
          ))}
        </PromptSection>
      ))}

      {editing && (
        <PromptEditorModal
          label={editing.label}
          value={editing.value}
          maxLength={editing.maxLength}
          busy={busy}
          onClose={() => setOpenField(null)}
          onSave={handleSave}
          onReset={editing.customized ? handleReset : undefined}
        />
      )}
    </div>
  );
}
