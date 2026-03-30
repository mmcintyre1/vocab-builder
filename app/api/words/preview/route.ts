import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { checkPin, getPinFromRequest } from "@/lib/auth";
import { generateWordData, buildCards } from "@/lib/cards/generate";
import { supabase } from "@/lib/supabase/client";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Module-level counter — resets on cold start, fine for personal use
let previewToday = { date: "", count: 0 };

// POST /api/words/preview — look up a word and return card previews without saving
// Body: { word: string }
export async function POST(request: NextRequest) {
  const pin = getPinFromRequest(request);
  if (!checkPin(pin)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { word: wordStr } = await request.json();
  if (!wordStr?.trim()) return NextResponse.json({ error: "word required" }, { status: 400 });

  // Daily preview rate limit
  const maxPreviews = parseInt(process.env.MAX_PREVIEWS_PER_DAY ?? "60");
  const today = new Date().toISOString().slice(0, 10);
  if (previewToday.date !== today) previewToday = { date: today, count: 0 };
  if (previewToday.count >= maxPreviews) {
    return NextResponse.json({ error: "Daily preview limit reached" }, { status: 429 });
  }
  previewToday.count++;

  const normalized = wordStr.trim().toLowerCase();

  // Check for duplicate before spending a Claude call
  const { data: existing } = await supabase
    .from("words")
    .select("id")
    .eq("word", normalized)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "Already exists" }, { status: 409 });
  }

  const wordData = await generateWordData(normalized, anthropic);
  const cards = buildCards(wordData);

  return NextResponse.json({
    word: normalized,
    definition: wordData.definition,
    cards: cards.map((c) => ({ type: c.type, front: c.front, back: c.back.replace(/\[audio:[^\]]+\]/, "").trim() })),
  });
}
