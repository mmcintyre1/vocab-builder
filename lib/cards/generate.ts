import Anthropic from "@anthropic-ai/sdk";
import { WordData } from "@/lib/dictionary/types";
import { CardType } from "@/lib/supabase/types";
import { DEFAULT_SYSTEM_PROMPT, buildPrompt, EntryType } from "./prompts";

export interface PromptOverrides {
  systemPrompt?: string;
  fields?: Record<string, string>;
}

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

// Kept for backward compatibility (tests, and anywhere a bare default prompt is useful)
export const wordDataPrompt = (word: string) => buildPrompt("word", word);
export const conceptDataPrompt = (concept: string) => buildPrompt("concept", concept);
export const referenceDataPrompt = (ref: string) => buildPrompt("reference", ref);

// Single Claude call — generates all word data
export async function generateWordData(
  word: string,
  anthropic: Anthropic,
  entryType: EntryType = "word",
  overrides?: PromptOverrides
): Promise<WordData> {
  const prompt = buildPrompt(entryType, word, overrides);
  const message = await anthropic.messages.create({
    model: process.env.CLAUDE_MODEL ?? "claude-haiku-4-5-20251001",
    max_tokens: 600,
    system: overrides?.systemPrompt || DEFAULT_SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0];
  if (text.type !== "text") throw new Error("Unexpected Claude response type");
  const raw = text.text.trim().replace(/^```json\s*/i, "").replace(/```$/, "");
  const parsed = JSON.parse(raw);

  return {
    word,
    definition: parsed.definition,
    allDefinitions: [parsed.definition],
    simplePhonetic: parsed.phonetic ?? null,
    audioUrl: null,
    exampleSentence: parsed.sentence ?? null,
    etymology: parsed.etymology ?? null,
    connotation: parsed.connotation ?? null,
    implication: parsed.implication ?? null,
    context: parsed.context ?? null,
    significance: parsed.significance ?? null,
  };
}

export function buildCards(
  wordData: WordData,
  entryType: "word" | "concept" | "reference" = "word"
): CardDraft[] {
  const cards: CardDraft[] = [];

  // Definition card — always present
  cards.push({
    type: "definition",
    front: wordData.word,
    back: wordData.definition,
  });

  if (entryType === "reference") {
    // Cloze
    if (wordData.exampleSentence) {
      const cloze = makeCloze(wordData.exampleSentence, wordData.word);
      if (isClozeUsable(cloze, wordData.word)) {
        cards.push({ type: "cloze", front: cloze, back: wordData.word });
      }
    }

    // Context card
    if (wordData.context) {
      cards.push({
        type: "context",
        front: `What is the historical context of "${wordData.word}"?`,
        back: wordData.context,
      });
    }

    // Significance card
    if (wordData.significance) {
      cards.push({
        type: "significance",
        front: `What does invoking "${wordData.word}" signal?`,
        back: wordData.significance,
      });
    }
  } else if (entryType === "concept") {
    // Cloze card
    if (wordData.exampleSentence) {
      const cloze = makeCloze(wordData.exampleSentence, wordData.word);
      if (isClozeUsable(cloze, wordData.word)) {
        cards.push({ type: "cloze", front: cloze, back: wordData.word });
      }
    }

    // Etymology card
    if (wordData.etymology) {
      cards.push({
        type: "etymology",
        front: `What is the origin of "${wordData.word}"?`,
        back: wordData.etymology,
      });
    }

    // Implication card
    if (wordData.implication) {
      cards.push({
        type: "implication",
        front: `What does "${wordData.word}" imply about the world or how we reason?`,
        back: wordData.implication,
      });
    }
  } else {
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
    if (wordData.exampleSentence) {
      const cloze = makeCloze(wordData.exampleSentence, wordData.word);
      if (isClozeUsable(cloze, wordData.word)) {
        cards.push({ type: "cloze", front: cloze, back: wordData.word });
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

    // Connotation card — only for culturally/literarily loaded words
    if (wordData.connotation) {
      cards.push({
        type: "connotation",
        front: `What is the cultural or literary significance of "${wordData.word}"?`,
        back: wordData.connotation,
      });
    }
  }

  return cards;
}
