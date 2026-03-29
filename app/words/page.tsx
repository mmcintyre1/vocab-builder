"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

function getPin(): string {
  return sessionStorage.getItem("vb_pin") ?? "";
}

interface WordRow {
  id: string;
  word: string;
  source: string | null;
  tags: string[];
  added_at: string;
  cards: { id: string; type: string; next_review: string; reps: number; lapses: number }[];
}

function dueCount(cards: WordRow["cards"]): number {
  const now = new Date();
  return cards.filter((c) => new Date(c.next_review) <= now).length;
}

export default function WordsPage() {
  const [words, setWords] = useState<WordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTag, setFilterTag] = useState("");

  const fetchWords = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterTag) params.set("tag", filterTag);
    const res = await fetch(`/api/words?${params}`, { headers: { "x-pin": getPin() } });
    const data = await res.json();
    setWords(data);
    setLoading(false);
  }, [filterTag]);

  useEffect(() => { fetchWords(); }, [fetchWords]);

  // Collect all unique tags across words
  const allTags = Array.from(new Set(words.flatMap((w) => w.tags))).sort();

  const filtered = words.filter((w) =>
    w.word.toLowerCase().includes(search.toLowerCase()) ||
    (w.source ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const totalDue = words.reduce((n, w) => n + dueCount(w.cards), 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-800">Words</h1>
        <span className="text-sm text-stone-400">{words.length} total · {totalDue} due</span>
      </div>

      {/* Search */}
      <input
        type="search"
        placeholder="Search…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="input-field"
      />

      {/* Tag filter */}
      {allTags.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterTag("")}
            className={`tag-chip ${!filterTag ? "tag-chip-active" : ""}`}
          >
            All
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setFilterTag(tag === filterTag ? "" : tag)}
              className={`tag-chip ${filterTag === tag ? "tag-chip-active" : ""}`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      {loading ? (
        <p className="text-stone-400 text-sm text-center py-8">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-stone-400 text-sm text-center py-8">No words yet. <Link href="/add" className="underline underline-offset-2">Add some →</Link></p>
      ) : (
        <ul className="flex flex-col divide-y divide-stone-100">
          {filtered.map((w) => {
            const due = dueCount(w.cards);
            return (
              <li key={w.id}>
                <Link
                  href={`/words/${w.id}`}
                  className="flex items-center justify-between py-3 gap-3 hover:bg-stone-50 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="font-medium text-stone-800 truncate">{w.word}</span>
                    <div className="flex gap-2 flex-wrap">
                      {w.source && (
                        <span className="text-xs text-stone-400">{w.source}</span>
                      )}
                      {w.tags.map((t) => (
                        <span key={t} className="text-xs bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
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
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
