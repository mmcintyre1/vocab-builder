import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { checkPin, getPinFromRequest } from "@/lib/auth";
import { generateWordData, buildCards, PromptOverrides } from "@/lib/cards/generate";
import { getGlobalOverrides, mergeOverrides } from "@/lib/cards/promptSettings";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Module-level counter — resets on cold start, fine for personal use
let regenerateToday = { date: "", count: 0 };

// POST /api/words/preview/regenerate — regenerate a single card's content for
// a word that hasn't been saved yet (the Add page's preview screen).
// Body: { word: string, entryType, cardType: string, promptOverrides? }
export async function POST(request: NextRequest) {
  const pin = getPinFromRequest(request);
  if (!checkPin(pin)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { word: wordStr, entryType = "word", cardType, promptOverrides } = await request.json() as {
    word: string;
    entryType?: "word" | "concept" | "reference";
    cardType: string;
    promptOverrides?: PromptOverrides;
  };
  if (!wordStr?.trim() || !cardType) {
    return NextResponse.json({ error: "word and cardType required" }, { status: 400 });
  }

  const maxRegenerations = parseInt(process.env.MAX_PREVIEWS_PER_DAY ?? "60");
  const today = new Date().toISOString().slice(0, 10);
  if (regenerateToday.date !== today) regenerateToday = { date: today, count: 0 };
  if (regenerateToday.count >= maxRegenerations) {
    return NextResponse.json({ error: "Daily regeneration limit reached" }, { status: 429 });
  }
  regenerateToday.count++;

  const normalized = wordStr.trim().toLowerCase();
  const globalOverrides = await getGlobalOverrides(entryType);
  const effectiveOverrides = mergeOverrides(globalOverrides, promptOverrides);
  const wordData = await generateWordData(normalized, anthropic, entryType, effectiveOverrides);
  const drafts = buildCards(wordData, entryType);
  const draft = drafts.find((c) => c.type === cardType);

  if (!draft) {
    return NextResponse.json(
      { error: `Regeneration didn't produce a "${cardType}" card this time — try again` },
      { status: 422 }
    );
  }

  return NextResponse.json({
    type: draft.type,
    front: draft.front,
    back: draft.back.replace(/\[audio:[^\]]+\]/, "").trim(),
  });
}
