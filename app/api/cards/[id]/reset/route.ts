import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { checkPin, getPinFromRequest } from "@/lib/auth";
import { newCardState } from "@/lib/fsrs/algorithm";

// POST /api/cards/[id]/reset — wipe a card's SRS progress and review history, making it "new" again
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const pin = getPinFromRequest(request);
  if (!checkPin(pin)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const fresh = newCardState();

  const { data, error } = await supabase
    .from("cards")
    .update({
      stability: fresh.stability,
      difficulty: fresh.difficulty,
      reps: fresh.reps,
      lapses: fresh.lapses,
      last_rating: fresh.lastRating,
      last_review: fresh.lastReview,
      next_review: fresh.nextReview.toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("reviews").delete().eq("card_id", id);

  return NextResponse.json(data);
}
