import { describe, it, expect } from "vitest";
import { extractWordData } from "./fetch";
import type { DictionaryEntry } from "./types";

const sampleEntry: DictionaryEntry[] = [
  {
    word: "ephemeral",
    phonetic: "/ɪˈfɛm(ə)r(ə)l/",
    phonetics: [
      { text: "/ɪˈfɛm(ə)r(ə)l/", audio: "https://example.com/ephemeral.mp3" },
    ],
    origin: "mid 16th century: from Greek ephēmeros",
    meanings: [
      {
        partOfSpeech: "adjective",
        definitions: [
          {
            definition: "lasting for a very short time",
            example: "The ephemeral beauty of the cherry blossoms drew crowds every spring.",
          },
        ],
      },
      {
        partOfSpeech: "noun",
        definitions: [
          {
            definition: "an ephemeral plant",
          },
        ],
      },
    ],
  },
];

describe("extractWordData", () => {
  it("extracts the word", () => {
    expect(extractWordData(sampleEntry).word).toBe("ephemeral");
  });

  it("extracts IPA phonetic", () => {
    expect(extractWordData(sampleEntry).ipa).toBe("/ɪˈfɛm(ə)r(ə)l/");
  });

  it("extracts audio URL", () => {
    expect(extractWordData(sampleEntry).audioUrl).toBe(
      "https://example.com/ephemeral.mp3"
    );
  });

  it("extracts primary definition with part of speech", () => {
    expect(extractWordData(sampleEntry).definition).toBe(
      "(adjective) lasting for a very short time"
    );
  });

  it("extracts all definitions", () => {
    const data = extractWordData(sampleEntry);
    expect(data.allDefinitions).toHaveLength(2);
    expect(data.allDefinitions[0]).toContain("adjective");
    expect(data.allDefinitions[1]).toContain("noun");
  });

  it("extracts example sentence", () => {
    expect(extractWordData(sampleEntry).exampleSentence).toContain("cherry blossoms");
  });

  it("extracts etymology", () => {
    expect(extractWordData(sampleEntry).etymology).toContain("Greek");
  });

  it("handles missing phonetics gracefully", () => {
    const entry = [{ ...sampleEntry[0], phonetics: [], phonetic: undefined }];
    const data = extractWordData(entry);
    expect(data.ipa).toBeNull();
    expect(data.audioUrl).toBeNull();
  });

  it("handles missing origin gracefully", () => {
    const entry = [{ ...sampleEntry[0], origin: undefined }];
    expect(extractWordData(entry).etymology).toBeNull();
  });

  it("handles missing examples gracefully", () => {
    const entry: DictionaryEntry[] = [
      {
        ...sampleEntry[0],
        meanings: [
          {
            partOfSpeech: "adjective",
            definitions: [{ definition: "lasting a short time" }],
          },
        ],
      },
    ];
    expect(extractWordData(entry).exampleSentence).toBeNull();
  });
});
