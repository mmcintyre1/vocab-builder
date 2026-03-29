"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { CardWithWord } from "@/lib/supabase/types";

function getPin(): string {
  return sessionStorage.getItem("vb_pin") ?? "";
}

const RATINGS = [
  { value: 1, label: "Again", color: "bg-red-100 text-red-700 border-red-200 active:bg-red-200" },
  { value: 2, label: "Hard", color: "bg-orange-100 text-orange-700 border-orange-200 active:bg-orange-200" },
  { value: 3, label: "Good", color: "bg-green-100 text-green-700 border-green-200 active:bg-green-200" },
  { value: 4, label: "Easy", color: "bg-blue-100 text-blue-700 border-blue-200 active:bg-blue-200" },
] as const;

function formatCardType(type: string): string {
  return { definition: "Definition", pronunciation: "Pronunciation", cloze: "Fill in", etymology: "Etymology" }[type] ?? type;
}

function renderBack(card: CardWithWord): React.ReactNode {
  if (card.type === "pronunciation") {
    const lines = card.back.split("\n");
    const ipa = lines[0];
    const audioLine = lines.find((l) => l.startsWith("[audio:"));
    const audioUrl = audioLine?.slice(7, -1);
    return (
      <div className="flex flex-col items-center gap-3">
        <span className="text-2xl font-light tracking-wide text-stone-700">{ipa}</span>
        {audioUrl && (
          <audio controls src={audioUrl} className="w-full max-w-xs" />
        )}
      </div>
    );
  }
  return <span className="text-stone-700 leading-relaxed whitespace-pre-line">{card.back}</span>;
}

export default function StudyPage() {
  const [cards, setCards] = useState<CardWithWord[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);

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

    await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-pin": getPin() },
      body: JSON.stringify({ cardId: card.id, rating }),
    });

    setSessionCount((n) => n + 1);
    setSubmitting(false);

    if (index + 1 < cards.length) {
      setIndex((i) => i + 1);
      setRevealed(false);
    } else {
      // Refetch — might have new "again" cards due
      await fetchDue();
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-stone-400">
        Loading…
      </div>
    );
  }

  if (!card) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <p className="text-4xl">◈</p>
        <h2 className="text-xl font-semibold text-stone-800">All caught up</h2>
        {sessionCount > 0 && (
          <p className="text-stone-500 text-sm">{sessionCount} card{sessionCount !== 1 ? "s" : ""} reviewed this session</p>
        )}
        <p className="text-stone-400 text-sm">No cards due right now.</p>
        <Link href="/add" className="mt-2 text-sm underline underline-offset-2 text-stone-500">
          Add new words →
        </Link>
      </div>
    );
  }

  const remaining = cards.length - index;

  return (
    <div className="flex flex-col gap-6">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm text-stone-400">
        <span>{formatCardType(card.type)}</span>
        <span>{remaining} left</span>
      </div>

      {/* Word label */}
      <p className="text-xs font-medium text-stone-400 uppercase tracking-widest">
        {card.words?.word}
      </p>

      {/* Card face */}
      <div
        className="min-h-[200px] flex items-center justify-center rounded-2xl border border-stone-200 bg-white p-6 cursor-pointer select-none shadow-sm"
        onClick={() => !revealed && setRevealed(true)}
      >
        <div className="flex flex-col items-center gap-4 w-full">
          {/* Front */}
          <p className="text-xl text-center text-stone-800 leading-relaxed font-medium">
            {card.front}
          </p>

          {/* Back (revealed) */}
          {revealed ? (
            <div className="w-full pt-4 border-t border-stone-100 text-center">
              {renderBack(card)}
            </div>
          ) : (
            <p className="text-sm text-stone-300 mt-2">tap to reveal</p>
          )}
        </div>
      </div>

      {/* Rating buttons */}
      {revealed && (
        <div className="grid grid-cols-4 gap-2">
          {RATINGS.map(({ value, label, color }) => (
            <button
              key={value}
              onClick={() => handleRating(value)}
              disabled={submitting}
              className={`py-3 rounded-xl border text-sm font-medium transition-colors ${color} disabled:opacity-50`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Source chip */}
      {card.words?.source && (
        <p className="text-xs text-center text-stone-300">
          from {card.words.source}
        </p>
      )}
    </div>
  );
}
