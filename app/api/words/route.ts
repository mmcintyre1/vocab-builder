import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "@/lib/supabase/client";
import { lookupWord } from "@/lib/dictionary/fetch";
import { buildCards, generateClozeSentence } from "@/lib/cards/generate";
import { checkPin, getPinFromRequest } from "@/lib/auth";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// GET /api/words — list all words with optional tag/source filter
export async function GET(request: NextRequest) {
  const pin = getPinFromRequest(request);
  if (!checkPin(pin)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const tag = searchParams.get("tag");
  const source = searchParams.get("source");

  let query = supabase
    .from("words")
    .select("*, cards(id, type, next_review, reps, lapses)")
    .order("added_at", { ascending: false });

  if (tag) query = query.contains("tags", [tag]);
  if (source) query = query.eq("source", source);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/words — add one or more words
// Body: { words: string[], source?: string } OR { word: string, source?: string, notes?: string }
export async function POST(request: NextRequest) {
  const pin = getPinFromRequest(request);
  if (!checkPin(pin)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  // Normalize to array
  const wordList: string[] = body.words
    ? body.words.map((w: string) => w.trim().toLowerCase()).filter(Boolean)
    : [body.word?.trim().toLowerCase()].filter(Boolean);

  if (wordList.length === 0) {
    return NextResponse.json({ error: "No words provided" }, { status: 400 });
  }

  // Daily rate limit — guards against brute-force API cost abuse
  const limit = parseInt(process.env.MAX_WORDS_PER_DAY ?? "50");
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("words")
    .select("*", { count: "exact", head: true })
    .gte("added_at", dayStart.toISOString());
  if ((count ?? 0) + wordList.length > limit) {
    return NextResponse.json(
      { error: `Daily limit of ${limit} words reached` },
      { status: 429 }
    );
  }

  const results = [];
  const errors = [];

  for (const wordStr of wordList) {
    try {
      // Check for duplicate
      const { data: existing } = await supabase
        .from("words")
        .select("id")
        .eq("word", wordStr)
        .maybeSingle();

      if (existing) {
        errors.push({ word: wordStr, error: "Already exists" });
        continue;
      }

      // Fetch dictionary data
      const wordData = await lookupWord(wordStr);

      // Try to get a good cloze sentence
      let clozeSentence: string | null = null;
      if (!wordData.exampleSentence || wordData.exampleSentence.split(" ").length < 8) {
        try {
          clozeSentence = await generateClozeSentence(
            wordStr,
            wordData.definition,
            anthropic
          );
        } catch {
          // Claude unavailable — fall back to dictionary example
          clozeSentence = wordData.exampleSentence;
        }
      }

      // Insert word
      const { data: word, error: wordErr } = await supabase
        .from("words")
        .insert({
          word: wordStr,
          source: body.source ?? null,
          notes: body.notes ?? null,
          tags: body.tags ?? [],
        })
        .select()
        .single();

      if (wordErr) throw new Error(wordErr.message);

      // Generate and insert cards
      const cardDrafts = buildCards(wordData, clozeSentence);
      const { error: cardsErr } = await supabase.from("cards").insert(
        cardDrafts.map((c) => ({ ...c, word_id: word.id }))
      );

      if (cardsErr) throw new Error(cardsErr.message);

      results.push({ word: wordStr, id: word.id, cardCount: cardDrafts.length });
    } catch (err) {
      errors.push({ word: wordStr, error: (err as Error).message });
    }
  }

  return NextResponse.json({ results, errors }, { status: 201 });
}
