"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

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

function InlineSource({
  wordId,
  initial,
  allSources,
  onSaved,
}: {
  wordId: string;
  initial: string | null;
  allSources: string[];
  onSaved: (val: string | null) => void;
}) {
  const [value, setValue] = useState(initial ?? "");
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = `src-${wordId}`;

  async function save() {
    const trimmed = value.trim() || null;
    if (trimmed === initial) return;
    onSaved(trimmed);
    await fetch(`/api/words/${wordId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-pin": getPin() },
      body: JSON.stringify({ source: trimmed }),
    });
  }

  return (
    <div onClick={(e) => e.preventDefault()} className="flex-1 min-w-0">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); inputRef.current?.blur(); } }}
        placeholder="source…"
        list={listId}
        className="w-full text-xs text-stone-500 italic bg-transparent outline-none border-b border-dashed border-stone-200 focus:border-stone-400 placeholder:text-stone-300 focus:text-stone-700 focus:not-italic pb-px transition-colors"
        autoCapitalize="none"
        autoCorrect="off"
      />
      <datalist id={listId}>
        {allSources.map((s) => <option key={s} value={s} />)}
      </datalist>
    </div>
  );
}

export default function WordsPage() {
  const [words, setWords] = useState<WordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterSource, setFilterSource] = useState("");

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

  function updateSource(id: string, source: string | null) {
    setWords((prev) => prev.map((w) => w.id === id ? { ...w, source } : w));
  }

  async function deleteWord(id: string, wordStr: string) {
    if (!confirm(`Delete "${wordStr}"?`)) return;
    setWords((prev) => prev.filter((w) => w.id !== id));
    await fetch(`/api/words/${id}`, { method: "DELETE", headers: { "x-pin": getPin() } });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-800">Words</h1>
        <span className="text-sm text-stone-400">{words.length} total · {totalDue} due</span>
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
          {allSources.map((source) => (
            <button
              key={source}
              onClick={() => setFilterSource(filterSource === source ? "" : source)}
              className={`tag-chip ${filterSource === source ? "tag-chip-active" : ""}`}
            >
              {source}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-stone-400 text-sm text-center py-8">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-stone-400 text-sm text-center py-8">
          No words yet. <Link href="/add" className="underline underline-offset-2">Add some →</Link>
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-stone-100">
          {filtered.map((w) => {
            const due = dueCount(w.cards);
            return (
              <li key={w.id} className="flex items-center gap-2 py-2.5 -mx-2 px-2 group hover:bg-stone-50 rounded-lg transition-colors">
                {/* Word + source */}
                <Link href={`/words/${w.id}`} className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <span className="font-medium text-stone-800 truncate">{w.word}</span>
                </Link>

                {/* Inline source edit — sits in the middle */}
                <InlineSource
                  wordId={w.id}
                  initial={w.source}
                  allSources={allSources}
                  onSaved={(val) => updateSource(w.id, val)}
                />

                {/* Due / card count + date */}
                <div className="flex flex-col items-end shrink-0 text-xs">
                  {due > 0 ? (
                    <span className="text-amber-600 font-medium">{due} due</span>
                  ) : (
                    <span className="text-stone-300">{w.cards.length} cards</span>
                  )}
                  <span className="text-stone-300">
                    {new Date(w.added_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>

                {/* Delete — visible on hover/focus */}
                <button
                  onClick={(e) => { e.preventDefault(); deleteWord(w.id, w.word); }}
                  className="text-stone-200 hover:text-red-400 transition-colors text-lg leading-none shrink-0 opacity-0 group-hover:opacity-100"
                  aria-label="Delete"
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
