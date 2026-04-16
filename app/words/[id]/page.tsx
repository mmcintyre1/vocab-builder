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

const TYPE_ORDER = ["definition", "pronunciation", "cloze", "etymology", "connotation", "implication", "context", "significance"];
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

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function formatReviewStats(card: Card): string {
  const due = new Date(card.next_review) <= new Date();
  if (card.reps === 0 && card.lapses === 0) return "never reviewed · due now";
  const total = card.reps + card.lapses;
  const parts = [`${total} review${total !== 1 ? "s" : ""}`];
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

function CardRow({ card, forceEdit, onUpdate }: {
  card: Card;
  forceEdit: boolean;
  onUpdate: (id: string, updates: Partial<Card>) => void;
}) {
  const [localEditing, setLocalEditing] = useState(false);
  const editing = forceEdit || localEditing;
  const cleanBack = (card.back ?? "").replace(/\[audio:[^\]]+\]/, "").trim();
  const [front, setFront] = useState(card.front ?? "");
  const [back, setBack] = useState(cleanBack);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFront(card.front ?? "");
    setBack((card.back ?? "").replace(/\[audio:[^\]]+\]/, "").trim());
  }, [card.front, card.back]);

  const due = new Date(card.next_review) <= new Date();

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/cards/${card.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-pin": getPin() },
      body: JSON.stringify({ front, back }),
    });
    const updated = await res.json();
    onUpdate(card.id, { front: updated.front, back: updated.back });
    setSaving(false);
    setLocalEditing(false);
  }

  function handleCancel() {
    setFront(card.front ?? "");
    setBack((card.back ?? "").replace(/\[audio:[^\]]+\]/, "").trim());
    setLocalEditing(false);
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <span
          className="text-xs font-medium uppercase tracking-wide"
          style={{ color: due ? "var(--accent-fg)" : "var(--text-muted)" }}
        >
          {TYPE_LABEL[card.type] ?? card.type}
        </span>
        {!forceEdit && (
          <button
            onClick={() => setLocalEditing((e) => !e)}
            className="transition-colors"
            style={{ color: "var(--text)" }}
            aria-label={localEditing ? "Cancel edit" : "Edit card"}
          >
            <PencilIcon />
          </button>
        )}
      </div>

      {editing ? (
        <div className="px-4 pb-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs" style={{ color: "var(--text-muted)" }}>Front</label>
            <textarea
              value={front}
              onChange={(e) => setFront(e.target.value)}
              rows={2}
              className="input-field resize-none text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs" style={{ color: "var(--text-muted)" }}>Back</label>
            <textarea
              value={back}
              onChange={(e) => setBack(e.target.value)}
              rows={3}
              className="input-field resize-none text-sm"
            />
          </div>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? "Saving…" : "Save"}
          </button>
          {!forceEdit && (
            <button
              onClick={handleCancel}
              className="text-sm text-center"
              style={{ color: "var(--text-muted)" }}
            >
              Cancel
            </button>
          )}
        </div>
      ) : (
        <div className="px-4 pb-3 flex flex-col gap-1.5">
          <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>{card.front}</p>
          <p className="text-xs pt-1" style={{ color: "var(--text-muted)" }}>{formatReviewStats(card)}</p>
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
  const [revealAll, setRevealAll] = useState(false);
  const sourceRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      const headers = { "x-pin": getPin() };
      const [wordRes, listRes] = await Promise.all([
        fetch(`/api/words/${id}`, { headers }),
        fetch("/api/words", { headers }),
      ]);
      const wordData = await wordRes.json();
      if (wordRes.ok) setWord(wordData);
      const listData: any[] = await listRes.json();
      setAllSources(
        Array.from(new Set(listData.map((w: any) => w.source).filter(Boolean) as string[])).sort()
      );
      setLoading(false);
    }
    load();
  }, [id]);

  function updateCard(cardId: string, updates: Partial<Card>) {
    setWord((prev) =>
      prev ? { ...prev, cards: prev.cards.map((c) => c.id === cardId ? { ...c, ...updates } : c) } : prev
    );
  }

  async function handleSourceBlur() {
    if (!word) return;
    const val = sourceRef.current?.value.trim() || null;
    if (val === word.source) return;
    setWord((prev) => prev ? { ...prev, source: val } : prev);
    await fetch(`/api/words/${word.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-pin": getPin() },
      body: JSON.stringify({ source: val }),
    });
  }

  async function handleDelete() {
    if (!word) return;
    if (!confirm(`Delete "${word.word}" and all its cards?`)) return;
    await fetch(`/api/words/${word.id}`, { method: "DELETE", headers: { "x-pin": getPin() } });
    router.push("/words");
  }

  if (loading) return <div className="py-8 text-center" style={{ color: "var(--text-muted)" }}>Loading…</div>;
  if (!word) return <div className="py-8 text-center" style={{ color: "var(--text-muted)" }}>Word not found.</div>;

  const sortedCards = [...word.cards].sort(
    (a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type)
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-2 pb-2" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-start justify-between gap-3">
          <h1
            className="font-semibold tracking-tight leading-none"
            style={{ color: "var(--text)", fontSize: "clamp(2.2rem, 10vw, 3.5rem)" }}
          >
            {word.word}
          </h1>
          <button
            onClick={handleDelete}
            className="transition-colors hover:text-red-400 mt-1 shrink-0"
            style={{ color: "var(--text)" }}
            aria-label="Delete word"
          >
            <TrashIcon />
          </button>
        </div>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          Added {new Date(word.added_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </span>
      </div>

      {/* Source */}
      <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <span className="shrink-0" style={{ color: "var(--text-muted)" }}>Source</span>
        <div className="flex-1 relative">
          <input
            ref={sourceRef}
            type="text"
            defaultValue={word.source ?? ""}
            onBlur={handleSourceBlur}
            onKeyDown={(e) => { if (e.key === "Enter") sourceRef.current?.blur(); }}
            placeholder="none"
            list="source-suggestions"
            className="w-full bg-transparent outline-none pb-0.5 transition-colors border-b border-transparent focus:border-current"
            style={{ color: "var(--text)", caretColor: "var(--text)" }}
          />
          <datalist id="source-suggestions">
            {allSources.map((s) => <option key={s} value={s} />)}
          </datalist>
        </div>
      </div>

      {/* Notes */}
      {word.notes && (
        <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <p className="text-xs font-medium uppercase tracking-wide mb-1.5" style={{ color: "var(--text-muted)" }}>Notes</p>
          <p className="leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text)" }}>{word.notes}</p>
        </div>
      )}

      {/* Cards */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Cards ({sortedCards.length})
          </h2>
          <button
            onClick={() => setRevealAll((r) => !r)}
            className="text-xs transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            {revealAll ? "collapse all" : "edit all"}
          </button>
        </div>
        {sortedCards.map((card) => (
          <CardRow
            key={card.id}
            card={card}
            forceEdit={revealAll}
            onUpdate={updateCard}
          />
        ))}
      </div>
    </div>
  );
}
