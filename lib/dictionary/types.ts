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
  definition: string;         // primary definition with part of speech
  allDefinitions: string[];   // all definitions as strings
  ipa: string | null;         // IPA pronunciation text
  audioUrl: string | null;    // audio pronunciation URL
  exampleSentence: string | null;  // best example sentence from dictionary
  etymology: string | null;   // origin text
}
