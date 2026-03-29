import { DictionaryEntry, WordData } from "./types";

const API_BASE = "https://api.dictionaryapi.dev/api/v2/entries/en";

export async function fetchDictionaryEntry(word: string): Promise<DictionaryEntry[] | null> {
  const res = await fetch(`${API_BASE}/${encodeURIComponent(word.toLowerCase().trim())}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Dictionary API error ${res.status} for "${word}"`);
  return res.json() as Promise<DictionaryEntry[]>;
}

export function extractWordData(entries: DictionaryEntry[]): WordData {
  const entry = entries[0];

  // IPA: prefer phonetic with audio, fallback to first with text
  const phonetics = entry.phonetics ?? [];
  const withAudio = phonetics.find((p) => p.audio && p.text);
  const withText = phonetics.find((p) => p.text);
  const ipa = withAudio?.text ?? withText?.text ?? entry.phonetic ?? null;
  const audioUrl = withAudio?.audio ?? phonetics.find((p) => p.audio)?.audio ?? null;

  // Definitions
  const allDefinitions: string[] = [];
  let primaryDefinition = "";
  let exampleSentence: string | null = null;

  for (const meaning of entry.meanings) {
    const pos = meaning.partOfSpeech;
    for (const def of meaning.definitions) {
      const text = `(${pos}) ${def.definition}`;
      allDefinitions.push(text);
      if (!primaryDefinition) primaryDefinition = text;

      // Pick the best example: prefer longer, context-rich sentences
      if (!exampleSentence && def.example && def.example.length > 30) {
        exampleSentence = def.example;
      }
    }
  }

  // Shorter example as fallback
  if (!exampleSentence) {
    for (const meaning of entry.meanings) {
      for (const def of meaning.definitions) {
        if (def.example) {
          exampleSentence = def.example;
          break;
        }
      }
      if (exampleSentence) break;
    }
  }

  return {
    word: entry.word,
    definition: primaryDefinition,
    allDefinitions,
    ipa,
    audioUrl: audioUrl ?? null,
    exampleSentence,
    etymology: entry.origin ?? null,
  };
}

// Returns null if the word is not in the dictionary (404)
export async function lookupWord(word: string): Promise<WordData | null> {
  const entries = await fetchDictionaryEntry(word);
  if (!entries) return null;
  return extractWordData(entries);
}
