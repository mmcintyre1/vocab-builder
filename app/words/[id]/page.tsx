"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";

function getPin(): string {
  return sessionStorage.getItem("vb_pin") ?? "";
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

export default function WordDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [word, setWord] = useState<Word | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editingSource, setEditingSource] = useState(false);
  const [sourceInput, setSourceInput] = useState("");
  const [editingTags, setEditingTags] = useState(false);
  const [tagsInput, setTagsInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      // Fetch all words and find by id (no single-word endpoint needed)
      const res = await fetch("/api/words", { headers: { "x-pin": getPin() } });
      const data: Word[] = await res.json();
      const found = data.find((w) => w.id === id);
      if (found) {
        setWord(found);
        setSourceInput(found.source ?? "");
        setTagsInput(found.tags.join(", "));
      }
      setLoading(false);
    }
    load();
  }, [id]);

  async function saveField(field: "source" | "tags") {
    if (!word) return;
    setSaving(true);
    const update =
      field === "source"
        ? { source: sourceInput.trim() || null }
        : { tags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean) };

    const res = await fetch(`/api/words/${word.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-pin": getPin() },
      body: JSON.stringify(update),
    });
    const updated = await res.json();
    setWord((prev) => prev ? { ...prev, ...updated } : prev);
    if (field === "source") setEditingSource(false);
    if (field === "tags") setEditingTags(false);
    setSaving(false);
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
        {/* Source */}
        <div className="flex items-center gap-2">
          <span className="text-stone-400 w-14 shrink-0">Source</span>
          {editingSource ? (
            <div className="flex gap-2 flex-1">
              <input
                className="input-field flex-1 text-sm py-1"
                value={sourceInput}
                onChange={(e) => setSourceInput(e.target.value)}
                placeholder="e.g. Moby Dick"
                autoFocus
              />
              <button onClick={() => saveField("source")} disabled={saving} className="text-stone-600 font-medium">Save</button>
              <button onClick={() => setEditingSource(false)} className="text-stone-400">Cancel</button>
            </div>
          ) : (
            <button
              onClick={() => setEditingSource(true)}
              className="text-stone-600 hover:underline underline-offset-2"
            >
              {word.source ?? <span className="text-stone-300 italic">none — tap to add</span>}
            </button>
          )}
        </div>

        {/* Tags */}
        <div className="flex items-start gap-2">
          <span className="text-stone-400 w-14 shrink-0 pt-0.5">Tags</span>
          {editingTags ? (
            <div className="flex gap-2 flex-1">
              <input
                className="input-field flex-1 text-sm py-1"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="comma-separated tags"
                autoFocus
              />
              <button onClick={() => saveField("tags")} disabled={saving} className="text-stone-600 font-medium">Save</button>
              <button onClick={() => setEditingTags(false)} className="text-stone-400">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setEditingTags(true)} className="flex flex-wrap gap-1">
              {word.tags.length > 0
                ? word.tags.map((t) => (
                    <span key={t} className="bg-stone-200 text-stone-600 px-2 py-0.5 rounded text-xs">{t}</span>
                  ))
                : <span className="text-stone-300 italic text-sm">none — tap to add</span>
              }
            </button>
          )}
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
                {card.back.replace(/\[audio:[^\]]+\]/, "").trim()}
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

      {/* Delete */}
      <button
        onClick={handleDelete}
        className="text-sm text-red-400 hover:text-red-600 text-center py-2 transition-colors"
      >
        Delete word
      </button>
    </div>
  );
}
