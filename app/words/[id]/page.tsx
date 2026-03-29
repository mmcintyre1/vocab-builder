"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import TagInput from "@/components/TagInput";

function getPin(): string {
  return localStorage.getItem("vb_pin") ?? "";
}

interface Card {
  id: string;
  type: string;
  front: string;
  back: string;
  reps: number;
  lapses: number;
  next_review: string;
  stability: number;
}

interface Word {
  id: string;
  word: string;
  source: string | null;
  tags: string[];
  notes: string | null;
  added_at: string;
  cards: Card[];
}

const TYPE_ORDER = ["definition", "pronunciation", "cloze", "etymology"];

async function patchWord(id: string, update: Record<string, unknown>) {
  const res = await fetch(`/api/words/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-pin": getPin() },
    body: JSON.stringify(update),
  });
  return res.json();
}

export default function WordDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [word, setWord] = useState<Word | null>(null);
  const [loading, setLoading] = useState(true);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [allSources, setAllSources] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/words", { headers: { "x-pin": getPin() } });
      const data: Word[] = await res.json();
      setAllTags(Array.from(new Set(data.flatMap((w) => w.tags))).sort());
      setAllSources(
        Array.from(new Set(data.map((w) => w.source).filter(Boolean) as string[])).sort()
      );
      const found = data.find((w) => w.id === id);
      if (found) setWord(found);
      setLoading(false);
    }
    load();
  }, [id]);

  // Tags: save on change
  async function handleTagsChange(tags: string[]) {
    if (!word) return;
    setWord((prev) => prev ? { ...prev, tags } : prev);
    await patchWord(word.id, { tags });
  }

  // Source: save on blur
  const sourceRef = useRef<HTMLInputElement>(null);
  async function handleSourceBlur() {
    if (!word) return;
    const val = sourceRef.current?.value.trim() || null;
    if (val === word.source) return;
    setWord((prev) => prev ? { ...prev, source: val } : prev);
    await patchWord(word.id, { source: val });
  }

  async function handleDelete() {
    if (!word) return;
    if (!confirm(`Delete "${word.word}" and all its cards?`)) return;
    await fetch(`/api/words/${word.id}`, {
      method: "DELETE",
      headers: { "x-pin": getPin() },
    });
    router.push("/words");
  }

  if (loading) return <div className="text-stone-400 py-8 text-center">Loading…</div>;
  if (!word) return <div className="text-stone-400 py-8 text-center">Word not found.</div>;

  const sortedCards = [...word.cards].sort(
    (a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type)
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-800">{word.word}</h1>
        <span className="text-xs text-stone-400">
          {new Date(word.added_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
      </div>

      {/* Metadata */}
      <div className="flex flex-col gap-3 bg-stone-50 rounded-xl p-4 text-sm">
        <div className="flex items-center gap-3">
          <span className="text-stone-400 w-14 shrink-0">Source</span>
          <div className="flex-1 relative">
            <input
              ref={sourceRef}
              type="text"
              defaultValue={word.source ?? ""}
              onBlur={handleSourceBlur}
              placeholder="none"
              className="w-full bg-transparent outline-none text-stone-700 placeholder:text-stone-300 border-b border-transparent focus:border-stone-300 pb-0.5 transition-colors"
              list="source-suggestions"
            />
            <datalist id="source-suggestions">
              {allSources.map((s) => <option key={s} value={s} />)}
            </datalist>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-stone-400 w-14 shrink-0 pt-2">Tags</span>
          <div className="flex-1">
            <TagInput value={word.tags} onChange={handleTagsChange} suggestions={allTags} />
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-stone-400 uppercase tracking-widest">Cards</h2>
        {sortedCards.map((card) => {
          const due = new Date(card.next_review) <= new Date();
          const nextReviewDate = new Date(card.next_review).toLocaleDateString("en-US", {
            month: "short", day: "numeric",
          });
          return (
            <div key={card.id} className="bg-white border border-stone-200 rounded-xl p-4 flex flex-col gap-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-stone-400 uppercase tracking-wide">
                  {card.type}
                </span>
                <span className={`text-xs ${due ? "text-amber-600" : "text-stone-300"}`}>
                  {due ? "due" : `next: ${nextReviewDate}`}
                </span>
              </div>
              <p className="text-sm text-stone-700 leading-relaxed">{card.front}</p>
              <p className="text-sm text-stone-400 border-t border-stone-100 pt-2 leading-relaxed">
                {(card.back ?? "").replace(/\[audio:[^\]]+\]/, "").trim()}
              </p>
              <div className="flex gap-3 text-xs text-stone-300">
                <span>{card.reps} reps</span>
                <span>{card.lapses} lapses</span>
                {card.stability > 0 && (
                  <span>stability {card.stability.toFixed(1)}d</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={handleDelete}
        className="text-sm text-red-400 hover:text-red-600 text-center py-2 transition-colors"
      >
        Delete word
      </button>
    </div>
  );
}
