"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";

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
  last_review: string | null;
  next_review: string;
  stability: number;
}

interface Word {
  id: string;
  word: string;
  source: string | null;
  notes: string | null;
  added_at: string;
  cards: Card[];
}

const TYPE_ORDER = ["definition", "pronunciation", "cloze", "etymology"];
const TYPE_LABEL: Record<string, string> = {
  definition: "Definition",
  pronunciation: "Pronunciation",
  cloze: "Fill in",
  etymology: "Etymology",
};

function formatReviewStats(card: Card): string {
  const due = new Date(card.next_review) <= new Date();
  const parts: string[] = [];

  if (card.reps === 0 && card.lapses === 0) {
    return "never reviewed · due now";
  }

  const total = card.reps + card.lapses;
  parts.push(`${total} review${total !== 1 ? "s" : ""}`);

  if (card.last_review) {
    const d = new Date(card.last_review);
    parts.push(`last ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`);
  }

  if (due) {
    parts.push("due now");
  } else {
    const next = new Date(card.next_review);
    parts.push(`next ${next.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`);
  }

  return parts.join(" · ");
}

function CardRow({ card, allSources: _allSources, onUpdate }: {
  card: Card;
  allSources: string[];
  onUpdate: (id: string, updates: Partial<Card>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [front, setFront] = useState(card.front);
  const [back, setBack] = useState(card.back.replace(/\[audio:[^\]]+\]/, "").trim());
  const [saving, setSaving] = useState(false);

  const due = new Date(card.next_review) <= new Date();

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/cards/${card.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-pin": localStorage.getItem("vb_pin") ?? "" },
      body: JSON.stringify({ front, back }),
    });
    const updated = await res.json();
    onUpdate(card.id, { front: updated.front, back: updated.back });
    setSaving(false);
    setEditing(false);
  }

  function handleCancel() {
    setFront(card.front);
    setBack(card.back.replace(/\[audio:[^\]]+\]/, "").trim());
    setEditing(false);
  }

  return (
    <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <span className={`text-xs font-medium uppercase tracking-wide ${due ? "text-amber-600" : "text-stone-400"}`}>
          {TYPE_LABEL[card.type] ?? card.type}
        </span>
        <button
          onClick={() => setEditing((e) => !e)}
          className="text-xs text-stone-400 hover:text-stone-700 transition-colors"
        >
          {editing ? "cancel" : "edit"}
        </button>
      </div>

      {editing ? (
        <div className="px-4 pb-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-stone-400">Front</label>
            <textarea
              value={front}
              onChange={(e) => setFront(e.target.value)}
              rows={2}
              className="input-field resize-none text-sm"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-stone-400">Back</label>
            <textarea
              value={back}
              onChange={(e) => setBack(e.target.value)}
              rows={3}
              className="input-field resize-none text-sm"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button onClick={handleCancel} className="text-sm text-stone-400 text-center">
            Cancel
          </button>
        </div>
      ) : (
        <div className="px-4 pb-3 flex flex-col gap-2">
          <p className="text-sm text-stone-800 leading-relaxed">{card.front}</p>
          <p className="text-sm text-stone-500 border-t border-stone-100 pt-2 leading-relaxed">
            {card.back.replace(/\[audio:[^\]]+\]/, "").trim()}
          </p>
          <p className="text-xs text-stone-300 pt-1">{formatReviewStats(card)}</p>
        </div>
      )}
    </div>
  );
}

export default function WordDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [word, setWord] = useState<Word | null>(null);
  const [loading, setLoading] = useState(true);
  const [allSources, setAllSources] = useState<string[]>([]);
  const sourceRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/words", { headers: { "x-pin": localStorage.getItem("vb_pin") ?? "" } });
      const data: any[] = await res.json();
      setAllSources(
        Array.from(new Set(data.map((w) => w.source).filter(Boolean) as string[])).sort()
      );
      const found = data.find((w) => w.id === id);
      if (found) setWord(found);
      setLoading(false);
    }
    load();
  }, [id]);

  function updateCard(cardId: string, updates: Partial<Card>) {
    setWord((prev) =>
      prev
        ? { ...prev, cards: prev.cards.map((c) => c.id === cardId ? { ...c, ...updates } : c) }
        : prev
    );
  }

  async function handleSourceBlur() {
    if (!word) return;
    const val = sourceRef.current?.value.trim() || null;
    if (val === word.source) return;
    setWord((prev) => prev ? { ...prev, source: val } : prev);
    await fetch(`/api/words/${word.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-pin": localStorage.getItem("vb_pin") ?? "" },
      body: JSON.stringify({ source: val }),
    });
  }

  async function handleDelete() {
    if (!word) return;
    if (!confirm(`Delete "${word.word}" and all its cards?`)) return;
    await fetch(`/api/words/${word.id}`, {
      method: "DELETE",
      headers: { "x-pin": localStorage.getItem("vb_pin") ?? "" },
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

      <div className="flex items-center gap-3 bg-stone-50 rounded-xl px-4 py-3 text-sm">
        <span className="text-stone-400 shrink-0">Source</span>
        <div className="flex-1 relative">
          <input
            ref={sourceRef}
            type="text"
            defaultValue={word.source ?? ""}
            onBlur={handleSourceBlur}
            onKeyDown={(e) => { if (e.key === "Enter") sourceRef.current?.blur(); }}
            placeholder="none"
            list="source-suggestions"
            className="w-full bg-transparent outline-none text-stone-700 placeholder:text-stone-300 border-b border-transparent focus:border-stone-300 pb-0.5 transition-colors"
          />
          <datalist id="source-suggestions">
            {allSources.map((s) => <option key={s} value={s} />)}
          </datalist>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-stone-400 uppercase tracking-widest">
          Cards ({sortedCards.length})
        </h2>
        {sortedCards.map((card) => (
          <CardRow
            key={card.id}
            card={card}
            allSources={allSources}
            onUpdate={updateCard}
          />
        ))}
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
