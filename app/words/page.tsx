"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { nextDueDate, isoToDaysLabel } from "@/lib/cards/schedule";

function getPin(): string {
  return localStorage.getItem("vb_pin") ?? "";
}

interface WordRow {
  id: string;
  word: string;
  source: string | null;
  added_at: string;
  cards: { id: string; next_review: string }[];
}

function dueCount(cards: WordRow["cards"]): number {
  const now = new Date();
  return cards.filter((c) => new Date(c.next_review) <= now).length;
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}


export default function WordsPage() {
  const [words, setWords] = useState<WordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const fetchWords = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterSource) params.set("source", filterSource);
    const res = await fetch(`/api/words?${params}`, { headers: { "x-pin": getPin() } });
    const data = await res.json();
    setWords(data);
    setLoading(false);
  }, [filterSource]);

  useEffect(() => { fetchWords(); }, [fetchWords]);

  const allSources = Array.from(
    new Set(words.map((w) => w.source).filter(Boolean) as string[])
  ).sort();

  const filtered = words.filter((w) =>
    w.word.toLowerCase().includes(search.toLowerCase()) ||
    (w.source ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const totalDue = words.reduce((n, w) => n + dueCount(w.cards), 0);

  async function deleteWord(id: string) {
    setConfirmingId(null);
    setWords((prev) => prev.filter((w) => w.id !== id));
    await fetch(`/api/words/${id}`, { method: "DELETE", headers: { "x-pin": getPin() } });
  }

  function handleDeleteTap(id: string) {
    if (confirmingId === id) {
      deleteWord(id);
    } else {
      setConfirmingId(id);
      setTimeout(() => setConfirmingId((c) => (c === id ? null : c)), 3000);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--text)" }}>Words</h1>
        <span className="text-sm" style={{ color: "var(--text-muted)" }}>
          {words.length} total{totalDue > 0 ? ` · ${totalDue} due` : ""}
        </span>
      </div>

      <input
        type="search"
        placeholder="Search…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="input-field"
      />

      {allSources.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {allSources.map((source) => {
            const active = filterSource === source;
            return (
              <button
                key={source}
                onClick={() => setFilterSource(active ? "" : source)}
                className={`tag-chip ${active ? "tag-chip-active" : ""} flex items-center gap-1`}
              >
                {source}
                {active && <span className="opacity-60 text-sm leading-none">×</span>}
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <ul className="flex flex-col" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="flex items-center gap-3 py-4" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              <div className="flex flex-col gap-2 flex-1">
                <div className="skeleton h-4 rounded" style={{ width: `${60 + (i % 3) * 20}px` }} />
                {i % 2 === 0 && <div className="skeleton h-3 rounded w-24" />}
              </div>
              <div className="skeleton h-3 rounded w-12" />
              <div className="skeleton h-4 w-4 rounded" />
            </li>
          ))}
        </ul>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
          No words yet.{" "}
          <Link href="/add" className="underline underline-offset-2">Add some →</Link>
        </p>
      ) : (
        <ul className="flex flex-col" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          {filtered.map((w) => {
            const due = dueCount(w.cards);
            return (
              <li
                key={w.id}
                className="flex items-center gap-3 py-3"
                style={{ borderBottom: "1px solid var(--border-subtle)" }}
              >
                {/* Word + source stacked */}
                <Link href={`/words/${w.id}`} className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <span className="font-medium" style={{ color: "var(--text)" }}>{w.word}</span>
                  {w.source && (
                    <span className="text-xs italic truncate" style={{ color: "var(--text-muted)" }}>{w.source}</span>
                  )}
                </Link>

                {/* Due badge */}
                <div className="shrink-0 text-xs text-right">
                  {due > 0 ? (
                    <span className="font-medium" style={{ color: "var(--accent-fg)" }}>{due} due</span>
                  ) : (() => {
                    const next = nextDueDate(w.cards);
                    return next ? (
                      <span style={{ color: "var(--text-muted)" }}>due {isoToDaysLabel(next)}</span>
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>{w.cards.length} cards</span>
                    );
                  })()}
                </div>

                {/* Delete — two-tap confirm; p-2 gives 44px tap target */}
                <button
                  onClick={(e) => { e.preventDefault(); handleDeleteTap(w.id); }}
                  className="shrink-0 p-2 -mr-2 transition-colors"
                  style={{ color: confirmingId === w.id ? "#f87171" : "var(--text-muted)" }}
                  aria-label={confirmingId === w.id ? "Confirm delete" : "Delete"}
                >
                  {confirmingId === w.id
                    ? <span className="text-xs font-medium">Delete?</span>
                    : <TrashIcon />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
