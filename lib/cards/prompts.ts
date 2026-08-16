// Client-safe: no SDK import, so this can be imported from both API routes
// and client components (e.g. the Add page's prompt preview/customization UI).

export type EntryType = "word" | "concept" | "reference";

export interface FieldSpec {
  key: string;
  label: string;
  instruction: string;
}

export const DEFAULT_SYSTEM_PROMPT =
  "You are a vocabulary tutor building spaced repetition flashcards for a reader who wants to instantly recognize and correctly use these words, concepts, and references when they encounter them in real literary, journalistic, and academic prose. " +
  "Favour precision over breadth. Every field should be useful on a flashcard: concise enough to read at a glance, rich enough to be memorable. " +
  "Each field should express exactly one fact or idea, phrased as a single clause where possible — favor a short simple sentence over a compound one. " +
  "Phrase every answer as a direct statement of the fact — never restate the word, term, or name as the subject of the sentence (avoid patterns like \"X is significant because…\" or \"Invoking X signals…\"). " +
  "The reader can already see the term on the front of the card; start straight in on the answer.";

const ENTRY_LABEL: Record<EntryType, string> = {
  word: "word",
  concept: "concept",
  reference: "named reference",
};

export const FIELD_SPECS: Record<EntryType, FieldSpec[]> = {
  word: [
    {
      key: "definition",
      label: "Definition",
      instruction: "(part of speech) Under 12 words. State the core meaning only — no elaboration.",
    },
    {
      key: "phonetic",
      label: "Pronunciation",
      instruction: "Syllable respelling with the stressed syllable in capitals, e.g. ih-FEM-er-ul or mah-KET. No IPA.",
    },
    {
      key: "sentence",
      label: "Example sentence",
      instruction: "A 10–20 word sentence in a literary or journalistic register. The word's meaning should be strongly inferable from context — a learner should be able to deduce it — but not trivially obvious.",
    },
    {
      key: "etymology",
      label: "Etymology",
      instruction: "State directly the language of origin and root meaning. One clause, max 14 words, e.g. 'From Latin pallium (cloak).' Do not restate the word. Return null if unremarkable.",
    },
    {
      key: "connotation",
      label: "Connotation",
      instruction: "State directly the word's key cultural, literary, or rhetorical association — e.g. its genre, tradition, or defining context. One clause, max 18 words. Do not restate the word. Return null if the word carries no notable connotation.",
    },
  ],
  concept: [
    {
      key: "definition",
      label: "Definition",
      instruction: "(noun/concept) Under 12 words. State the core meaning only — no elaboration.",
    },
    {
      key: "sentence",
      label: "Example sentence",
      instruction: "A 10–20 word sentence where the concept's meaning is strongly inferable from context.",
    },
    {
      key: "etymology",
      label: "Etymology",
      instruction: "State directly the language of origin and root meaning. One clause, max 14 words, e.g. 'From Greek dialektikē (art of debate).' Do not restate the term. Return null if unremarkable.",
    },
    {
      key: "implication",
      label: "Implication",
      instruction: "State directly the broader significance or intellectual consequence of this concept — what it implies about the world or how we reason. One clause, max 20 words. Do not restate the term; open with the implication itself.",
    },
  ],
  reference: [
    {
      key: "definition",
      label: "Definition",
      instruction: "Under 12 words. What it is — no elaboration.",
    },
    {
      key: "sentence",
      label: "Example sentence",
      instruction: "A 10–20 word sentence where the reference appears naturally in context.",
    },
    {
      key: "context",
      label: "Historical context",
      instruction: "State directly who created or coined it, when, and where. One clause, max 18 words. Do not restate the name; open with the fact itself.",
    },
    {
      key: "significance",
      label: "Significance",
      instruction: "State directly what invoking this name signals or implies — its rhetorical or intellectual afterlife. One clause, max 20 words. Do not restate the name; open with the implication itself.",
    },
  ],
};

export function buildPrompt(
  entryType: EntryType,
  term: string,
  overrides?: { fields?: Partial<Record<string, string>> }
): string {
  const specs = FIELD_SPECS[entryType];
  const lines = specs
    .map((s) => `  "${s.key}": "${(overrides?.fields?.[s.key] || s.instruction).replace(/"/g, "'")}"`)
    .join(",\n");
  return `Provide flashcard content for the ${ENTRY_LABEL[entryType]} "${term}". Respond with a JSON object and no other text:\n{\n${lines}\n}`;
}
