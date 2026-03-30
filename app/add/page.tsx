"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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

const TYPE_LABEL: Record<string, string> = {
  definition: "Definition",
  pronunciation: "Pronunciation",
  cloze: "Fill in",
  etymology: "Etymology",
  connotation: "Connotation",
};

function getPin(): string {
  return localStorage.getItem("vb_pin") ?? "";
}

export default function AddPage() {
  const [mode, setMode] = useState<Mode>("single");

  const [word, setWord] = useState("");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");
  const [bulkText, setBulkText] = useState("");

  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [errors, setErrors] = useState<Result[]>([]);
  const [allSources, setAllSources] = useState<string[]>([]);

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
      body: JSON.stringify({ word: word.trim() }),
    });
    if (res.ok) {
      setPreview(await res.json());
    } else {
      setErrors([{ word: word.trim(), error: "Lookup failed" }]);
    }
    setLoading(false);
  }

  async function handleConfirmAdd() {
    if (!preview) return;
    setLoading(true);

    const res = await fetch("/api/words", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-pin": getPin() },
      body: JSON.stringify({ word: preview.word, source: source.trim() || null, notes: notes.trim() || null }),
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
            <input
              type="text"
              placeholder="Word"
              value={word}
              onChange={(e) => { setWord(e.target.value.toLowerCase()); setPreview(null); }}
              className="input-field text-base"
              autoFocus
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
                  {preview.cards.map((c) => (
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
              <button onClick={handleConfirmAdd} disabled={loading} className="btn-primary">
                {loading ? "Saving…" : "Add word"}
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
    </div>
  );
}
