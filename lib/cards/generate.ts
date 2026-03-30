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

// Single Claude call — generates all word data including optional connotation card
export async function generateWordData(
  word: string,
  anthropic: Anthropic
): Promise<WordData> {
  const message = await anthropic.messages.create({
    model: process.env.CLAUDE_MODEL ?? "claude-haiku-4-5-20251001",
    max_tokens: 600,
    messages: [
      {
        role: "user",
        content: `Provide dictionary and usage information for the word "${word}".
Respond with a JSON object and no other text:
{
  "definition": "(part of speech) primary definition",
  "phonetic": "Simple syllable respelling with stressed syllable in capitals, e.g. ih-FEM-er-ul or mah-KET",
  "sentence": "A 10–20 word sentence where the word's meaning is clearly inferable from context, in a literary or journalistic register.",
  "etymology": "Brief etymology (language of origin, root meaning), or null if unremarkable",
  "connotation": "The word's cultural, literary, rhetorical, or historical weight beyond its bare definition — e.g. its association with a tradition, genre, figure, or context. Return null if the word has no notable connotation."
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
    allDefinitions: [parsed.definition],
    simplePhonetic: parsed.phonetic ?? null,
    audioUrl: null,
    exampleSentence: parsed.sentence ?? null,
    etymology: parsed.etymology ?? null,
    connotation: parsed.connotation ?? null,
  };
}

export function buildCards(wordData: WordData): CardDraft[] {
  const cards: CardDraft[] = [];

  // Definition card
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
  if (wordData.exampleSentence) {
    const cloze = makeCloze(wordData.exampleSentence, wordData.word);
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

  // Connotation card — only for culturally/literarily loaded words
  if (wordData.connotation) {
    cards.push({
      type: "connotation",
      front: `What is the cultural or literary significance of "${wordData.word}"?`,
      back: wordData.connotation,
    });
  }

  return cards;
}
