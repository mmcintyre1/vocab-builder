"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FIELD_SPECS, EntryType } from "@/lib/cards/prompts";
import PromptFieldRow from "@/components/PromptFieldRow";
import PromptEditorModal from "@/components/PromptEditorModal";

type Mode = "single" | "bulk";

interface CardPreview {
  id?: string;
  type: string;
  front: string;
  back: string;
}

interface PreviewData {
  word: string;
  definition: string;
  cards: CardPreview[];
}

interface Result {
  word: string;
  id?: string;
  cards?: CardPreview[];
  error?: string;
}

const ENTRY_HELP: Record<EntryType, string> = {
  word: "An actual vocabulary word — generates a definition, pronunciation, example sentence, etymology, and cultural connotation.",
  concept: "An abstract idea or framework (e.g. \"confirmation bias\") — generates a definition, example sentence, etymology, and its broader implication.",
  reference: "A named person, work, or event (e.g. \"the Pelagian heresy\") — generates a definition, example sentence, historical context, and what invoking it signals.",
};

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

const TYPE_LABEL: Record<string, string> = {
  definition: "Definition",
  pronunciation: "Pronunciation",
  cloze: "Fill in",
  etymology: "Etymology",
  connotation: "Connotation",
  implication: "Implication",
  context: "Context",
  significance: "Significance",
};

function getPin(): string {
  return localStorage.getItem("vb_pin") ?? "";
}

function SparklesIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2z" />
      <path d="M19 15l.9 2.6 2.6.9-2.6.9L19 22l-.9-2.6-2.6-.9 2.6-.9L19 15z" />
    </svg>
  );
}

export default function AddPage() {
  const [mode, setMode] = useState<Mode>("single");
  const [entryType, setEntryType] = useState<EntryType>("word");

  const [word, setWord] = useState("");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");
  const [bulkText, setBulkText] = useState("");

  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<Result[]>([]);
  const [errors, setErrors] = useState<Result[]>([]);
  const [allSources, setAllSources] = useState<string[]>([]);

  const [promptSettings, setPromptSettings] = useState<PromptSettingsResponse | null>(null);
  const [showCustomize, setShowCustomize] = useState(false);
  const [customSystem, setCustomSystem] = useState("");
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [savingDefault, setSavingDefault] = useState(false);
  const [regeneratingType, setRegeneratingType] = useState<string | null>(null);
  const [showEntryHelp, setShowEntryHelp] = useState(false);
  const [openPromptField, setOpenPromptField] = useState<string | null>(null); // "system" | field key

  useEffect(() => {
    async function loadSources() {
      const res = await fetch("/api/words", { headers: { "x-pin": getPin() } });
      if (!res.ok) return;
      const data: { source: string | null }[] = await res.json();
      setAllSources(
        Array.from(new Set(data.map((w) => w.source).filter(Boolean) as string[])).sort()
      );
    }
    loadSources();
  }, []);

  async function loadPromptSettings() {
    const res = await fetch("/api/settings/prompts", { headers: { "x-pin": getPin() } });
    if (res.ok) setPromptSettings(await res.json());
  }

  useEffect(() => {
    loadPromptSettings();
  }, []);

  // Reset the customize panel's textareas to the effective (custom-or-default)
  // values whenever the entry type changes or settings finish loading.
  useEffect(() => {
    if (!promptSettings) return;
    setCustomSystem(promptSettings.system.custom ?? promptSettings.system.default);
    const typeFields = promptSettings[entryType];
    const next: Record<string, string> = {};
    for (const spec of FIELD_SPECS[entryType]) {
      next[spec.key] = typeFields[spec.key]?.custom ?? typeFields[spec.key]?.default ?? spec.instruction;
    }
    setCustomFields(next);
  }, [entryType, promptSettings]);

  async function handleSaveDefaultPrompt() {
    setSavingDefault(true);
    await fetch("/api/settings/prompts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-pin": getPin() },
      body: JSON.stringify({ system: customSystem, [entryType]: customFields }),
    });
    await loadPromptSettings();
    setSavingDefault(false);
  }

  async function fetchCards(id: string): Promise<CardPreview[]> {
    const res = await fetch(`/api/words/${id}`, { headers: { "x-pin": getPin() } });
    if (!res.ok) return [];
    const data = await res.json();
    const ORDER = ["definition", "pronunciation", "cloze", "etymology"];
    return (data.cards ?? [])
      .map((c: any) => ({
        id: c.id,
        type: c.type,
        front: c.front ?? "",
        back: (c.back ?? "").replace(/\[audio:[^\]]+\]/, "").trim(),
      }))
      .sort((a: CardPreview, b: CardPreview) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type));
  }

  async function handlePreview(e: React.FormEvent) {
    e.preventDefault();
    if (!word.trim()) return;
    setLoading(true);
    setPreview(null);
    setResults([]);
    setErrors([]);

    const res = await fetch("/api/words/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-pin": getPin() },
      body: JSON.stringify({
        word: word.trim(),
        entryType,
        ...(showCustomize ? { promptOverrides: { systemPrompt: customSystem, fields: customFields } } : {}),
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setPreview(data);
      setSelectedTypes(new Set(data.cards.map((c: CardPreview) => c.type)));
    } else {
      const data = await res.json();
      setErrors([{ word: word.trim(), error: data.error ?? "Lookup failed" }]);
    }
    setLoading(false);
  }

  async function handleRegenerateCard(cardType: string) {
    if (!preview) return;
    setRegeneratingType(cardType);
    const res = await fetch("/api/words/preview/regenerate", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-pin": getPin() },
      body: JSON.stringify({
        word: preview.word,
        entryType,
        cardType,
        ...(showCustomize ? { promptOverrides: { systemPrompt: customSystem, fields: customFields } } : {}),
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setPreview((prev) => prev ? {
        ...prev,
        cards: prev.cards.map((c) => c.type === cardType ? { ...c, front: updated.front, back: updated.back } : c),
      } : prev);
    }
    setRegeneratingType(null);
  }

  async function handleConfirmAdd() {
    if (!preview) return;
    setLoading(true);

    const cards = preview.cards.filter((c) => selectedTypes.has(c.type));
    const res = await fetch("/api/words", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-pin": getPin() },
      body: JSON.stringify({ word: preview.word, entryType, source: source.trim() || null, notes: notes.trim() || null, cards }),
    });
    const data = await res.json();
    setErrors(data.errors ?? []);
    setPreview(null);

    const enriched: Result[] = await Promise.all(
      (data.results ?? []).map(async (r: Result) => ({
        ...r,
        cards: r.id ? await fetchCards(r.id) : [],
      }))
    );
    setResults(enriched);
    setLoading(false);
    if (enriched.length > 0) setWord("");
  }

  async function handleBulkSubmit(e: React.FormEvent) {
    e.preventDefault();
    const words = bulkText.split(/[\n,]+/).map((w) => w.trim()).filter(Boolean);
    if (words.length === 0) return;

    setLoading(true);
    setResults([]);
    setErrors([]);

    const res = await fetch("/api/words", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-pin": getPin() },
      body: JSON.stringify({ words, source: source.trim() || null }),
    });
    const data = await res.json();
    setErrors(data.errors ?? []);

    const enriched: Result[] = await Promise.all(
      (data.results ?? []).map(async (r: Result) => ({
        ...r,
        cards: r.id ? await fetchCards(r.id) : [],
      }))
    );
    setResults(enriched);
    setLoading(false);
    if (enriched.length > 0) setBulkText("");
  }

  const [showNotes, setShowNotes] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      {/* Mode toggle — compact, secondary */}
      <div className="flex gap-3 text-sm">
        {(["single", "bulk"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setResults([]); setErrors([]); }}
            className="capitalize transition-colors pb-0.5"
            style={mode === m
              ? { color: "var(--text)", borderBottom: "1px solid var(--text)" }
              : { color: "var(--text-muted)", borderBottom: "1px solid transparent" }
            }
          >
            {m}
          </button>
        ))}
      </div>

      {mode === "single" ? (
        <>
          <form onSubmit={handlePreview} className="flex flex-col gap-3">
            {/* Word / Concept toggle */}
            <div className="flex gap-3 text-sm">
              {(["word", "concept", "reference"] as EntryType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setEntryType(t); setPreview(null); }}
                  className="capitalize transition-colors pb-0.5"
                  style={entryType === t
                    ? { color: "var(--text)", borderBottom: "1px solid var(--text)" }
                    : { color: "var(--text-muted)", borderBottom: "1px solid transparent" }
                  }
                >
                  {t}
                </button>
              ))}
            </div>
            {showEntryHelp ? (
              <p className="text-xs -mt-1.5" style={{ color: "var(--text-muted)" }}>
                {ENTRY_HELP[entryType]}{" "}
                <button
                  type="button"
                  onClick={() => setShowEntryHelp(false)}
                  className="underline underline-offset-2"
                >
                  hide
                </button>
              </p>
            ) : (
              <button
                type="button"
                onClick={() => setShowEntryHelp(true)}
                className="text-xs text-left -mt-1.5 transition-colors"
                style={{ color: "var(--text-faint)" }}
              >
                What's the difference? →
              </button>
            )}

            {showCustomize ? (
              <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between px-4 pt-3 pb-2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                    Prompt for this add
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCustomize(false)}
                    className="text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Hide
                  </button>
                </div>
                <ul className="flex flex-col divide-y" style={{ borderColor: "var(--border-subtle)" }}>
                  <PromptFieldRow
                    label="System prompt (shared across types)"
                    onClick={() => setOpenPromptField("system")}
                  />
                  {FIELD_SPECS[entryType].map((spec) => (
                    <PromptFieldRow
                      key={spec.key}
                      label={spec.label}
                      onClick={() => setOpenPromptField(spec.key)}
                    />
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={handleSaveDefaultPrompt}
                  disabled={savingDefault}
                  className="w-full text-xs text-left px-4 py-3"
                  style={{ color: "var(--text-muted)", borderTop: "1px solid var(--border-subtle)" }}
                >
                  {savingDefault ? "Saving…" : "Save as default for future adds →"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowCustomize(true)}
                className="text-xs text-left transition-colors"
                style={{ color: "var(--text-muted)" }}
              >
                Customize prompt for this add →
              </button>
            )}

            <input
              type="text"
              placeholder={entryType === "concept" ? "Concept" : entryType === "reference" ? "Reference" : "Word"}
              value={word}
              onChange={(e) => { setWord(e.target.value.toLowerCase()); setPreview(null); }}
              className="input-field text-base"
              autoFocus
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="off"
            />
            <div className="relative">
              <input
                type="text"
                placeholder="Source (optional)"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="input-field"
                list="source-suggestions"
              />
              <datalist id="source-suggestions">
                {allSources.map((s) => <option key={s} value={s} />)}
              </datalist>
            </div>
            {showNotes ? (
              <textarea
                placeholder="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="input-field resize-none"
                autoFocus
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowNotes(true)}
                className="text-xs text-left transition-colors"
                style={{ color: "var(--text-muted)" }}
              >
                + add notes
              </button>
            )}
            {!preview && (
              <button type="submit" disabled={loading || !word.trim()} className="btn-primary mt-1">
                {loading ? "Looking up…" : word.trim() ? "Look up →" : "Enter a word above"}
              </button>
            )}
          </form>

          {/* Preview */}
          {preview && (
            <div className="card-reveal flex flex-col gap-3">
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                <div className="px-4 pt-3 pb-2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <span className="font-semibold" style={{ color: "var(--text)" }}>{preview.word}</span>
                </div>
                <ul className="flex flex-col divide-y" style={{ borderColor: "var(--border)" }}>
                  {preview.cards.map((c) => {
                    const on = selectedTypes.has(c.type);
                    const toggle = () => setSelectedTypes((prev) => {
                      const next = new Set(prev);
                      on ? next.delete(c.type) : next.add(c.type);
                      return next;
                    });
                    return (
                      <li
                        key={c.type}
                        className="px-4 py-3 flex flex-col gap-1.5 transition-opacity"
                        style={{ opacity: on ? 1 : 0.4 }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                            {TYPE_LABEL[c.type] ?? c.type}
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleRegenerateCard(c.type)}
                              disabled={regeneratingType !== null}
                              className="p-1 transition-colors"
                              style={{ color: "var(--text-muted)", opacity: regeneratingType === c.type ? 0.5 : 1 }}
                              aria-label={`Regenerate ${TYPE_LABEL[c.type] ?? c.type} card`}
                            >
                              <SparklesIcon />
                            </button>
                            {/* Pill toggle */}
                            <button
                              type="button"
                              onClick={toggle}
                              className="shrink-0 rounded-full transition-colors"
                              style={{
                                width: 36, height: 20,
                                background: on ? "var(--accent)" : "var(--border)",
                                position: "relative",
                              }}
                              aria-label={on ? `Remove ${TYPE_LABEL[c.type]} card` : `Add ${TYPE_LABEL[c.type]} card`}
                            >
                              <span
                                className="absolute rounded-full transition-all"
                                style={{
                                  width: 14, height: 14,
                                  top: 3,
                                  left: on ? 19 : 3,
                                  background: "var(--bg)",
                                }}
                              />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>
                          {regeneratingType === c.type ? "Regenerating…" : c.front}
                        </p>
                        {c.back && regeneratingType !== c.type && (
                          <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)", borderTop: "1px solid var(--border-subtle)", paddingTop: "0.5rem", marginTop: "0.125rem" }}>{c.back}</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
              <button onClick={handleConfirmAdd} disabled={loading || selectedTypes.size === 0} className="btn-primary">
                {loading ? "Saving…" : `Add word · ${selectedTypes.size} card${selectedTypes.size !== 1 ? "s" : ""}`}
              </button>
              <button
                onClick={() => setPreview(null)}
                className="text-sm text-center"
                style={{ color: "var(--text-muted)" }}
              >
                Cancel
              </button>
            </div>
          )}
        </>
      ) : (
        <form onSubmit={handleBulkSubmit} className="flex flex-col gap-3">
          <textarea
            placeholder={"One word per line, or comma-separated:\nephemeral\npalliate\nsanguine"}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            rows={8}
            className="input-field resize-none font-mono text-sm"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <div className="relative">
            <input
              type="text"
              placeholder="Source (optional)"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="input-field"
              list="source-suggestions"
            />
            <datalist id="source-suggestions">
              {allSources.map((s) => <option key={s} value={s} />)}
            </datalist>
          </div>
          <button type="submit" disabled={loading || !bulkText.trim()} className="btn-primary mt-1">
            {loading ? "Adding…" : "Add all"}
          </button>
        </form>
      )}

      {/* Results */}
      {(results.length > 0 || errors.length > 0) && (
        <div className="flex flex-col gap-3 mt-1">
          {results.map((r) => (
            <div key={r.word} className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: "color-mix(in srgb, #16a34a 10%, var(--surface))", border: "1px solid color-mix(in srgb, #16a34a 30%, transparent)" }}>
              <span className="font-medium" style={{ color: "#86efac" }}>"{r.word}" added</span>
              {r.id && (
                <Link href={`/words/${r.id}`} className="text-xs" style={{ color: "#86efac", opacity: 0.7 }}>
                  View →
                </Link>
              )}
            </div>
          ))}

          {/* Bulk mode: show full card details */}
          {mode === "bulk" && results.map((r) => r.cards && r.cards.length > 0 && (
            <div key={`cards-${r.word}`} className="flex flex-col rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              <ul className="flex flex-col divide-y" style={{ borderColor: "var(--border)" }}>
                {r.cards.map((c) => (
                  <li key={c.type} className="px-4 py-3 flex flex-col gap-1.5">
                    <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                      {TYPE_LABEL[c.type] ?? c.type}
                    </span>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>{c.front}</p>
                    {c.back && (
                      <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)", borderTop: "1px solid var(--border-subtle)", paddingTop: "0.5rem", marginTop: "0.125rem" }}>{c.back}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {errors.map((e) => (
            <div key={e.word} className="flex items-center justify-between text-sm px-4 py-3 rounded-xl" style={{ background: "color-mix(in srgb, #dc2626 10%, var(--surface))", border: "1px solid color-mix(in srgb, #dc2626 30%, transparent)" }}>
              <span className="font-medium" style={{ color: "#fca5a5" }}>{e.word}</span>
              <span style={{ color: "#f87171" }}>{e.error}</span>
            </div>
          ))}

          {results.length > 0 && (
            <Link href="/study" className="text-sm text-center py-1" style={{ color: "var(--text-muted)" }}>
              Study now →
            </Link>
          )}
        </div>
      )}

      {openPromptField && (
        <PromptEditorModal
          label={
            openPromptField === "system"
              ? "System prompt"
              : FIELD_SPECS[entryType].find((s) => s.key === openPromptField)?.label ?? openPromptField
          }
          value={openPromptField === "system" ? customSystem : customFields[openPromptField] ?? ""}
          maxLength={openPromptField === "system" ? 1000 : 300}
          onClose={() => setOpenPromptField(null)}
          onSave={(v) => {
            if (openPromptField === "system") setCustomSystem(v);
            else setCustomFields((f) => ({ ...f, [openPromptField]: v }));
            setOpenPromptField(null);
          }}
        />
      )}
    </div>
  );
}
