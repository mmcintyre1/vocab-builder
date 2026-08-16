import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "@/lib/supabase/client";
import { checkPin, getPinFromRequest } from "@/lib/auth";
import { buildCards, generateWordData } from "@/lib/cards/generate";
import { getGlobalOverrides } from "@/lib/cards/promptSettings";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Module-level counter — resets on cold start, fine for personal use
let regenerateToday = { date: "", count: 0 };

// POST /api/cards/[id]/regenerate — re-run the LLM for this word and replace
// this one card's front/back with the freshly generated content
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const pin = getPinFromRequest(request);
  if (!checkPin(pin)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const maxRegenerations = parseInt(process.env.MAX_PREVIEWS_PER_DAY ?? "60");
  const today = new Date().toISOString().slice(0, 10);
  if (regenerateToday.date !== today) regenerateToday = { date: today, count: 0 };
  if (regenerateToday.count >= maxRegenerations) {
    return NextResponse.json({ error: "Daily regeneration limit reached" }, { status: 429 });
  }

  const { id } = await params;

  const { data: card, error: cardErr } = await supabase
    .from("cards")
    .select("id, type, word_id")
    .eq("id", id)
    .single();
  if (cardErr || !card) return NextResponse.json({ error: "Card not found" }, { status: 404 });

  const { data: word, error: wordErr } = await supabase
    .from("words")
    .select("word, entry_type")
    .eq("id", card.word_id)
    .single();
  if (wordErr || !word) return NextResponse.json({ error: "Word not found" }, { status: 404 });

  regenerateToday.count++;

  const globalOverrides = await getGlobalOverrides(word.entry_type);
  const wordData = await generateWordData(word.word, anthropic, word.entry_type, globalOverrides);
  const drafts = buildCards(wordData, word.entry_type);
  const draft = drafts.find((c) => c.type === card.type);

  if (!draft) {
    return NextResponse.json(
      { error: `Regeneration didn't produce a "${card.type}" card this time — try again` },
      { status: 422 }
    );
  }

  const { data: updated, error: updateErr } = await supabase
    .from("cards")
    .update({ front: draft.front, back: draft.back })
    .eq("id", id)
    .select()
    .single();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
  return NextResponse.json(updated);
}
