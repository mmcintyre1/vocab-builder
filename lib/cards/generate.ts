import Anthropic from "@anthropic-ai/sdk";
import { WordData } from "@/lib/dictionary/types";
import { CardType } from "@/lib/supabase/types";

export interface CardDraft {
  type: CardType;
  front: string;
  back: string;
}

// Build cloze sentence: replace word (case-insensitive, word-boundary) with blank
export function makeCloze(sentence: string, word: string): string {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Handle e-dropping: "dissemble" → "dissembling" (stem + ing, no final e)
  const pattern = escaped.endsWith("e")
    ? new RegExp(`\\b${escaped.slice(0, -1)}(?:e(?:s|d)?|ing|ly)?\\b`, "gi")
    : new RegExp(`\\b${escaped}(?:s|ed|ing|ly|d)?\\b`, "gi");
  return sentence.replace(pattern, "_____");
}

// Check if a cloze sentence is "good" — the blank is discernible from context
export function isClozeUsable(cloze: string, _word: string): boolean {
  const wordCount = cloze.split(/\s+/).length;
  const hasBlank = cloze.includes("_____");
  return hasBlank && wordCount >= 6;
}

// Generate cloze sentence + simple phonetic in a single Claude call
export async function generateCardExtras(
  word: string,
  definition: string,
  anthropic: Anthropic
): Promise<{ clozeSentence: string; simplePhonetic: string }> {
  const message = await anthropic.messages.create({
    model: process.env.CLAUDE_MODEL ?? "claude-haiku-4-5-latest",
    max_tokens: 200,
    messages: [
      {
        role: "user",
        content: `For the word "${word}" (${definition}), provide two things as JSON and nothing else:
{
  "sentence": "A 10–20 word sentence where the meaning of the word is inferable from context, in a literary or journalistic register.",
  "phonetic": "Simple syllable respelling with stressed syllable in capitals, e.g. ih-FEM-er-ul or DET-rih-vor"
}`,
      },
    ],
  });

  const text = message.content[0];
  if (text.type !== "text") throw new Error("Unexpected Claude response type");
  const raw = text.text.trim().replace(/^```json\s*/i, "").replace(/```$/, "");
  const parsed = JSON.parse(raw);
  return { clozeSentence: parsed.sentence, simplePhonetic: parsed.phonetic };
}

// Full word data from Claude — used when the dictionary API has no entry
export async function generateWordDataFromClaude(
  word: string,
  anthropic: Anthropic
): Promise<WordData> {
  const message = await anthropic.messages.create({
    model: process.env.CLAUDE_MODEL ?? "claude-haiku-4-5-latest",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `Provide dictionary-style information for the word "${word}".
Respond with a JSON object and no other text:
{
  "definition": "(part of speech) primary definition",
  "allDefinitions": ["(part of speech) definition 1", "(part of speech) definition 2"],
  "phonetic": "Simple syllable respelling with stressed syllable in capitals, e.g. ih-FEM-er-ul",
  "sentence": "A 10–20 word sentence where the word's meaning is inferable from context",
  "etymology": "brief etymology or null"
}`,
      },
    ],
  });

  const text = message.content[0];
  if (text.type !== "text") throw new Error("Unexpected Claude response type");
  const raw = text.text.trim().replace(/^```json\s*/i, "").replace(/```$/, "");
  const parsed = JSON.parse(raw);

  return {
    word,
    definition: parsed.definition,
    allDefinitions: parsed.allDefinitions,
    simplePhonetic: parsed.phonetic ?? null,
    audioUrl: null,
    exampleSentence: parsed.sentence ?? null,
    etymology: parsed.etymology ?? null,
  };
}

export function buildCards(wordData: WordData, clozeSentence: string | null): CardDraft[] {
  const cards: CardDraft[] = [];

  // Definition card — one clear primary definition (minimum information principle)
  cards.push({
    type: "definition",
    front: wordData.word,
    back: wordData.definition,
  });

  // Pronunciation card — only if we have a simple human-readable respelling
  if (wordData.simplePhonetic) {
    cards.push({
      type: "pronunciation",
      front: `How is "${wordData.word}" pronounced?`,
      back: wordData.audioUrl
        ? `${wordData.simplePhonetic}\n[audio:${wordData.audioUrl}]`
        : wordData.simplePhonetic,
    });
  }

  // Cloze card
  const sentence = clozeSentence ?? wordData.exampleSentence;
  if (sentence) {
    const cloze = makeCloze(sentence, wordData.word);
    if (isClozeUsable(cloze, wordData.word)) {
      cards.push({
        type: "cloze",
        front: cloze,
        back: wordData.word,
      });
    }
  }

  // Etymology card
  if (wordData.etymology) {
    cards.push({
      type: "etymology",
      front: `What is the etymology of "${wordData.word}"?`,
      back: wordData.etymology,
    });
  }

  return cards;
}
