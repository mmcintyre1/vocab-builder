import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { scheduleReview } from "@/lib/fsrs/algorithm";
import { checkPin, getPinFromRequest } from "@/lib/auth";
import type { Rating } from "@/lib/fsrs/types";
import type { Card } from "@/lib/supabase/types";

// GET /api/review — fetch cards due now (next_review <= now), joined with word
export async function GET(request: NextRequest) {
  const pin = getPinFromRequest(request);
  if (!checkPin(pin)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("cards")
    .select("*, words(word, source)")
    .lte("next_review", now)
    .order("next_review", { ascending: true })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Shuffle so cards from the same word don't appear in sequence
  const shuffled = data ? [...data].sort(() => Math.random() - 0.5) : [];
  return NextResponse.json(shuffled);
}

// POST /api/review — submit a rating for a card
// Body: { cardId: string, rating: 1|2|3|4 }
export async function POST(request: NextRequest) {
  const pin = getPinFromRequest(request);
  if (!checkPin(pin)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { cardId, rating } = await request.json();

  if (!cardId || ![1, 2, 3, 4].includes(rating)) {
    return NextResponse.json({ error: "cardId and rating (1–4) required" }, { status: 400 });
  }

  // Fetch current card state
  const { data: card, error: fetchErr } = await supabase
    .from("cards")
    .select("*")
    .eq("id", cardId)
    .single();

  if (fetchErr || !card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  const now = new Date();

  // Reconstruct CardState from DB row
  const currentState = {
    stability: (card as Card).stability,
    difficulty: (card as Card).difficulty,
    reps: (card as Card).reps,
    lapses: (card as Card).lapses,
    lastRating: (card as Card).last_rating as Rating | null,
    lastReview: (card as Card).last_review ? new Date((card as Card).last_review!) : null,
    nextReview: new Date((card as Card).next_review),
  };

  const { nextState } = scheduleReview(currentState, rating as Rating, now);

  // Update card
  const { error: updateErr } = await supabase
    .from("cards")
    .update({
      stability: nextState.stability,
      difficulty: nextState.difficulty,
      reps: nextState.reps,
      lapses: nextState.lapses,
      last_rating: nextState.lastRating,
      last_review: nextState.lastReview?.toISOString(),
      next_review: nextState.nextReview.toISOString(),
    })
    .eq("id", cardId);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // Append review history
  await supabase.from("reviews").insert({
    card_id: cardId,
    rating,
    reviewed_at: now.toISOString(),
  });

  return NextResponse.json({
    nextReview: nextState.nextReview.toISOString(),
    intervalDays: Math.round(
      (nextState.nextReview.getTime() - now.getTime()) / 86400000
    ),
  });
}

// DELETE /api/review — undo the most recent rating for a card
// Body: { cardId: string, previousState: { stability, difficulty, reps, lapses, lastRating, lastReview, nextReview } }
export async function DELETE(request: NextRequest) {
  const pin = getPinFromRequest(request);
  if (!checkPin(pin)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { cardId, previousState } = await request.json();
  if (!cardId || !previousState) {
    return NextResponse.json({ error: "cardId and previousState required" }, { status: 400 });
  }

  // Delete the most recent review for this card
  const { data: latest } = await supabase
    .from("reviews")
    .select("id")
    .eq("card_id", cardId)
    .order("reviewed_at", { ascending: false })
    .limit(1)
    .single();

  if (latest) {
    await supabase.from("reviews").delete().eq("id", latest.id);
  }

  // Restore previous FSRS state
  const { error } = await supabase
    .from("cards")
    .update({
      stability: previousState.stability,
      difficulty: previousState.difficulty,
      reps: previousState.reps,
      lapses: previousState.lapses,
      last_rating: previousState.lastRating,
      last_review: previousState.lastReview,
      next_review: previousState.nextReview,
    })
    .eq("id", cardId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
