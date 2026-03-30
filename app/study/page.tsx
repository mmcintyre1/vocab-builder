"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import type { CardWithWord } from "@/lib/supabase/types";

function getPin(): string {
  return localStorage.getItem("vb_pin") ?? "";
}

const RATINGS = [
  { value: 1, label: "Again", style: { background: "color-mix(in srgb, #dc2626 15%, var(--surface))", color: "#fca5a5", border: "1px solid color-mix(in srgb, #dc2626 30%, transparent)" } },
  { value: 2, label: "Hard",  style: { background: "color-mix(in srgb, #ea580c 15%, var(--surface))", color: "#fdba74", border: "1px solid color-mix(in srgb, #ea580c 30%, transparent)" } },
  { value: 3, label: "Good",  style: { background: "color-mix(in srgb, #16a34a 15%, var(--surface))", color: "#86efac", border: "1px solid color-mix(in srgb, #16a34a 30%, transparent)" } },
  { value: 4, label: "Easy",  style: { background: "color-mix(in srgb, #2563eb 15%, var(--surface))", color: "#93c5fd", border: "1px solid color-mix(in srgb, #2563eb 30%, transparent)" } },
] as const;

const TYPE_LABEL: Record<string, string> = {
  definition: "Definition",
  pronunciation: "Pronunciation",
  cloze: "Fill in",
  etymology: "Etymology",
  connotation: "Connotation",
};

function renderBack(card: CardWithWord): React.ReactNode {
  if (card.type === "pronunciation") {
    const lines = card.back.split("\n");
    const phonetic = lines[0];
    const audioLine = lines.find((l) => l.startsWith("[audio:"));
    const audioUrl = audioLine?.slice(7, -1);
    return (
      <div className="flex flex-col items-center gap-3">
        <span className="text-2xl font-light tracking-wide" style={{ color: "var(--text)" }}>{phonetic}</span>
        {audioUrl && <audio controls src={audioUrl} className="w-full max-w-xs" />}
      </div>
    );
  }
  return <span className="leading-relaxed whitespace-pre-line" style={{ color: "var(--text)" }}>{card.back}</span>;
}

// Swipe thresholds
const SWIPE_MIN = 60; // px to count as a swipe

export default function StudyPage() {
  const [cards, setCards] = useState<CardWithWord[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [undoCard, setUndoCard] = useState<CardWithWord | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Swipe state
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const [dragX, setDragX] = useState(0);
  const [swipeHint, setSwipeHint] = useState<"again" | "good" | "easy" | null>(null);

  const fetchDue = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/review", { headers: { "x-pin": getPin() } });
    const data = await res.json();
    setCards(data);
    setIndex(0);
    setRevealed(false);
    setLoading(false);
  }, []);

  useEffect(() => { fetchDue(); }, [fetchDue]);

  const card = cards[index];

  async function handleRating(rating: number) {
    if (!card || submitting) return;
    setSubmitting(true);

    const savedCard = card;
    await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-pin": getPin() },
      body: JSON.stringify({ cardId: card.id, rating }),
    });

    // Set up undo window (5s)
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndoCard(savedCard);
    undoTimer.current = setTimeout(() => setUndoCard(null), 5000);

    setSessionCount((n) => n + 1);
    setSubmitting(false);
    if (index + 1 < cards.length) {
      setIndex((i) => i + 1);
      setRevealed(false);
    } else {
      await fetchDue();
    }
  }

  async function handleUndo() {
    if (!undoCard) return;
    if (undoTimer.current) clearTimeout(undoTimer.current);
    const savedCard = undoCard;
    setUndoCard(null);

    await fetch("/api/review", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "x-pin": getPin() },
      body: JSON.stringify({
        cardId: savedCard.id,
        previousState: {
          stability: savedCard.stability,
          difficulty: savedCard.difficulty,
          reps: savedCard.reps,
          lapses: savedCard.lapses,
          lastRating: savedCard.last_rating,
          lastReview: savedCard.last_review,
          nextReview: savedCard.next_review,
        },
      }),
    });

    setSessionCount((n) => Math.max(0, n - 1));
    setCards((prev) => [savedCard, ...prev.filter((c) => c.id !== savedCard.id)]);
    setIndex(0);
    setRevealed(false);
  }

  // Keyboard shortcuts: space/enter to reveal, 1-4 to rate
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!revealed) setRevealed(true);
      } else if (revealed && ["1", "2", "3", "4"].includes(e.key)) {
        handleRating(parseInt(e.key));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed, card, submitting]);

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <div className="skeleton flex-1 h-1 rounded-full" />
          <div className="skeleton h-3 w-12 rounded" />
        </div>
        <div className="flex items-center justify-between">
          <div className="skeleton h-3 w-20 rounded" />
          <div className="skeleton h-3 w-16 rounded" />
        </div>
        <div className="rounded-2xl p-6 min-h-[220px] flex flex-col items-center justify-center gap-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="skeleton h-5 rounded w-3/4" />
          <div className="skeleton h-4 rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-muted)" }}>
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        <h2 className="text-xl font-semibold" style={{ color: "var(--text)" }}>All caught up</h2>
        {sessionCount > 0 && (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {sessionCount} card{sessionCount !== 1 ? "s" : ""} reviewed this session
          </p>
        )}
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>No cards due right now.</p>
        <Link href="/add" className="mt-2 text-sm underline underline-offset-2" style={{ color: "var(--text-muted)" }}>
          Add new words →
        </Link>
      </div>
    );
  }

  const remaining = cards.length - index;

  function handleTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
    setDragX(0);
    setSwipeHint(null);
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!touchStart.current || !revealed) return;
    const dx = e.touches[0].clientX - touchStart.current.x;
    setDragX(dx);
    if (dx < -SWIPE_MIN) setSwipeHint("again");
    else if (dx > SWIPE_MIN) setSwipeHint("easy");
    else setSwipeHint(null);
  }

  function handleTouchEnd() {
    if (!touchStart.current) return;
    const dx = dragX;
    setDragX(0);
    setSwipeHint(null);
    touchStart.current = null;
    if (dx < -SWIPE_MIN) handleRating(1);       // Again
    else if (dx > SWIPE_MIN) handleRating(4);   // Easy
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Undo toast */}
      {undoCard && (
        <div className="card-reveal flex items-center justify-between px-4 py-2.5 rounded-xl text-sm" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <span style={{ color: "var(--text-muted)" }}>Rated "{undoCard.words?.word}"</span>
          <button onClick={handleUndo} className="font-medium transition-colors" style={{ color: "var(--accent-fg)" }}>
            Undo
          </button>
        </div>
      )}

      {/* Progress bar */}
      <div className="flex flex-col gap-1.5">
        <div className="flex-1 rounded-full h-1.5" style={{ background: "var(--border)" }}>
          <div
            className="h-1.5 rounded-full transition-all duration-300"
            style={{ background: "var(--accent-fg)", width: `${(index / cards.length) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>
          <span>{index} of {cards.length}</span>
          <span>{remaining} left</span>
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
          {TYPE_LABEL[card.type] ?? card.type}
        </span>
        {card.words?.source && (
          <span className="text-xs" style={{ color: "var(--text-faint)" }}>{card.words.source}</span>
        )}
      </div>

      {/* Card */}
      <div
        className="relative min-h-[220px] flex items-center justify-center rounded-2xl p-6 cursor-pointer select-none"
        style={{
          background: "var(--surface)",
          border: `1px solid ${swipeHint === "again" ? "color-mix(in srgb, #dc2626 50%, var(--border))" : swipeHint === "easy" ? "color-mix(in srgb, #2563eb 50%, var(--border))" : "var(--border)"}`,
          transform: revealed ? `translateX(${Math.max(-30, Math.min(30, dragX * 0.3))}px)` : "none",
          transition: dragX === 0 ? "transform 0.2s ease, border-color 0.15s" : "border-color 0.15s",
        }}
        onClick={() => !revealed && setRevealed(true)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Swipe hint overlay */}
        {swipeHint === "again" && (
          <div className="absolute top-3 right-3 text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "color-mix(in srgb, #dc2626 20%, transparent)", color: "#fca5a5" }}>Again ←</div>
        )}
        {swipeHint === "easy" && (
          <div className="absolute top-3 left-3 text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "color-mix(in srgb, #2563eb 20%, transparent)", color: "#93c5fd" }}>→ Easy</div>
        )}

        <div className="flex flex-col items-center gap-5 w-full">
          <p className="text-lg text-center leading-relaxed font-medium" style={{ color: "var(--text)" }}>
            {card.front}
          </p>
          {revealed ? (
            <div className="card-reveal w-full pt-4 text-center" style={{ borderTop: "1px solid var(--border)" }}>
              {renderBack(card)}
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>tap to reveal</p>
          )}
        </div>
      </div>

      {/* Rating buttons */}
      {revealed && (
        <div className="rating-reveal flex flex-col gap-2">
          <div className="grid grid-cols-4 gap-2">
            {RATINGS.map(({ value, label, style }) => (
              <button
                key={value}
                onClick={() => handleRating(value)}
                disabled={submitting}
                className="py-3 rounded-xl text-sm font-medium transition-opacity disabled:opacity-40"
                style={style}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-center" style={{ color: "var(--text-faint)" }}>
            ← swipe again · swipe easy →
          </p>
          <p className="hidden sm:block text-xs text-center" style={{ color: "var(--text-faint)" }}>
            keys: 1 again · 2 hard · 3 good · 4 easy · space reveal
          </p>
        </div>
      )}
    </div>
  );
}
