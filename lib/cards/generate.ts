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
// Heuristic: sentence is long enough and contains enough surrounding words
export function isClozeUsable(cloze: string, _word: string): boolean {
  const wordCount = cloze.split(/\s+/).length;
  const hasBlank = cloze.includes("_____");
  return hasBlank && wordCount >= 6;
}

// Full word data from Claude — used when the dictionary API has no entry
export async function generateWordDataFromClaude(
  word: string,
  anthropic: Anthropic
): Promise<import("@/lib/dictionary/types").WordData> {
  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 400,
    messages: [
      {
        role: "user",
        content: `Provide dictionary-style information for the word "${word}".
Respond with a JSON object and no other text:
{
  "definition": "(part of speech) primary definition",
  "allDefinitions": ["(part of speech) definition 1", "(part of speech) definition 2"],
  "ipa": "IPA pronunciation or null",
  "exampleSentence": "A 10–20 word sentence where the word's meaning is inferable from context",
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
    ipa: parsed.ipa ?? null,
    audioUrl: null,
    exampleSentence: parsed.exampleSentence ?? null,
    etymology: parsed.etymology ?? null,
  };
}

export async function generateClozeSentence(
  word: string,
  definition: string,
  anthropic: Anthropic
): Promise<string> {
  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 150,
    messages: [
      {
        role: "user",
        content: `Write a single example sentence using the word "${word}" (${definition}).
The sentence must:
- Be 10–20 words long
- Use the word naturally in context
- Make the word's meaning inferable from surrounding context (not just blank memorization)
- Come from a realistic, literary or journalistic register

Output only the sentence, no quotation marks, no explanation.`,
      },
    ],
  });

  const text = message.content[0];
  if (text.type !== "text") throw new Error("Unexpected response type from Claude");
  return text.text.trim();
}

export function buildCards(wordData: WordData, clozeSentence: string | null): CardDraft[] {
  const cards: CardDraft[] = [];

  // Definition card
  cards.push({
    type: "definition",
    front: wordData.word,
    back: wordData.allDefinitions.join("\n"),
  });

  // Pronunciation card (only if we have IPA)
  if (wordData.ipa) {
    cards.push({
      type: "pronunciation",
      front: `How is "${wordData.word}" pronounced?`,
      back: wordData.audioUrl
        ? `${wordData.ipa}\n[audio:${wordData.audioUrl}]`
        : wordData.ipa,
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

  // Etymology card (only if we have origin)
  if (wordData.etymology) {
    cards.push({
      type: "etymology",
      front: `What is the etymology of "${wordData.word}"?`,
      back: wordData.etymology,
    });
  }

  return cards;
}
