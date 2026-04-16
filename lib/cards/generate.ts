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

const SYSTEM_PROMPT =
  "You are a vocabulary tutor building spaced repetition flashcards for a reader who regularly encounters literary, journalistic, and academic prose. " +
  "Your goal is to produce content that helps the learner deeply encode each word — not just recognize its definition, but understand its sound, origin, usage, and cultural weight. " +
  "Favour precision over breadth. Every field should be useful on a flashcard: concise enough to read at a glance, rich enough to be memorable.";

const wordDataPrompt = (word: string) =>
  `Provide flashcard content for the word "${word}". Respond with a JSON object and no other text:
{
  "definition": "(part of speech) One precise sentence that distinguishes this word from near-synonyms.",
  "phonetic": "Syllable respelling with the stressed syllable in capitals, e.g. ih-FEM-er-ul or mah-KET. No IPA.",
  "sentence": "A 10–20 word sentence in a literary or journalistic register. The word's meaning should be strongly inferable from context — a learner should be able to deduce it — but not trivially obvious.",
  "etymology": "Language of origin and root meaning in one sentence, e.g. 'From Latin pallium (cloak).' Return null if unremarkable.",
  "connotation": "One sentence (max 25 words) naming the word's key cultural, literary, or rhetorical association — e.g. its genre, tradition, or defining context. Return null if the word carries no notable connotation."
}`;

const conceptDataPrompt = (concept: string) =>
  `Provide flashcard content for the concept "${concept}". Respond with a JSON object and no other text:
{
  "definition": "(noun/concept) One precise sentence that distinguishes this concept from related ideas.",
  "sentence": "A 10–20 word sentence where the concept's meaning is strongly inferable from context.",
  "etymology": "Language of origin and root meaning in one sentence, e.g. 'From Greek dialektikē (art of debate).' Return null if unremarkable.",
  "implication": "One sentence (max 30 words) stating the broader significance or intellectual consequence of this concept — what it implies about the world or how we reason."
}`;

// Single Claude call — generates all word data
export async function generateWordData(
  word: string,
  anthropic: Anthropic,
  entryType: "word" | "concept" = "word"
): Promise<WordData> {
  const prompt = entryType === "concept" ? conceptDataPrompt(word) : wordDataPrompt(word);
  const message = await anthropic.messages.create({
    model: process.env.CLAUDE_MODEL ?? "claude-haiku-4-5-20251001",
    max_tokens: 600,
    system: SYSTEM_PROMPT,
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
  };
}

export function buildCards(
  wordData: WordData,
  entryType: "word" | "concept" = "word"
): CardDraft[] {
  const cards: CardDraft[] = [];

  // Definition card — always present
  cards.push({
    type: "definition",
    front: wordData.word,
    back: wordData.definition,
  });

  if (entryType === "concept") {
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
