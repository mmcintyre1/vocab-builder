export interface DictionaryPhonetic {
  text?: string;
  audio?: string;
}

export interface DictionaryDefinition {
  definition: string;
  example?: string;
  synonyms?: string[];
}

export interface DictionaryMeaning {
  partOfSpeech: string;
  definitions: DictionaryDefinition[];
}

export interface DictionaryEntry {
  word: string;
  phonetic?: string;
  phonetics?: DictionaryPhonetic[];
  origin?: string;
  meanings: DictionaryMeaning[];
}

// Normalized output after processing
export interface WordData {
  word: string;
  definition: string;            // primary definition with part of speech
  allDefinitions: string[];      // all definitions (for reference, not shown on card)
  simplePhonetic: string | null; // human-readable pronunciation, e.g. "ih-FEM-er-ul"
  audioUrl: string | null;       // audio pronunciation URL
  exampleSentence: string | null;
  etymology: string | null;
}
