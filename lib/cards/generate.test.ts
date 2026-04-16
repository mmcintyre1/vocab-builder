import { describe, it, expect } from "vitest";
import { makeCloze, isClozeUsable, buildCards } from "./generate";
import type { WordData } from "@/lib/dictionary/types";

describe("makeCloze", () => {
  it("replaces exact word with blank", () => {
    expect(makeCloze("The ephemeral beauty faded quickly.", "ephemeral")).toBe(
      "The _____ beauty faded quickly."
    );
  });

  it("replaces word case-insensitively", () => {
    expect(makeCloze("Ephemeral joys are still joys.", "ephemeral")).toBe(
      "_____ joys are still joys."
    );
  });

  it("replaces plural inflection", () => {
    expect(makeCloze("The lacunae in the text were obvious.", "lacuna")).toBe(
      "The lacunae in the text were obvious." // not matched — irregular plural, acceptable
    );
    // regular plural
    expect(makeCloze("His qualms were unfounded.", "qualm")).toBe(
      "His _____ were unfounded."
    );
  });

  it("replaces -ing inflection", () => {
    expect(makeCloze("She was dissembling her true feelings.", "dissemble")).toBe(
      "She was _____ her true feelings."
    );
  });

  it("does not replace partial word matches", () => {
    // 'sate' should not match inside 'satiated'
    expect(makeCloze("He was satiated after the meal.", "sate")).toBe(
      "He was satiated after the meal."
    );
  });

  it("replaces all occurrences", () => {
    const result = makeCloze("The ephemeral is ephemeral by definition.", "ephemeral");
    expect(result).toBe("The _____ is _____ by definition.");
  });
});

describe("isClozeUsable", () => {
  it("returns true for a good sentence", () => {
    expect(
      isClozeUsable("The _____ nature of morning frost surprised the hikers.", "ephemeral")
    ).toBe(true);
  });

  it("returns false if no blank", () => {
    expect(isClozeUsable("The ephemeral nature surprised them.", "ephemeral")).toBe(false);
  });

  it("returns false for too-short sentence", () => {
    expect(isClozeUsable("The _____.", "ephemeral")).toBe(false);
  });
});

const sampleWordData: WordData = {
  word: "ephemeral",
  definition: "(adjective) lasting for a very short time",
  allDefinitions: [
    "(adjective) lasting for a very short time",
    "(noun) an ephemeral plant",
  ],
  simplePhonetic: "ih-FEM-er-ul",
  audioUrl: "https://api.dictionaryapi.dev/media/pronunciations/en/ephemeral.mp3",
  exampleSentence: "The ephemeral beauty of the cherry blossoms drew crowds every spring.",
  etymology: "mid 16th century: from Greek ephēmeros (lasting only a day)",
  connotation: null,
  implication: null,
};

describe("buildCards (word entry type)", () => {
  it("always produces a definition card", () => {
    const cards = buildCards(sampleWordData);
    const def = cards.find((c) => c.type === "definition");
    expect(def).toBeDefined();
    expect(def!.front).toBe("ephemeral");
    expect(def!.back).toContain("lasting for a very short time");
  });

  it("produces a pronunciation card when simplePhonetic is available", () => {
    const cards = buildCards(sampleWordData);
    const pron = cards.find((c) => c.type === "pronunciation");
    expect(pron).toBeDefined();
    expect(pron!.back).toContain("ih-FEM-er-ul");
    expect(pron!.back).toContain("audio:");
  });

  it("does not produce pronunciation card when simplePhonetic is missing", () => {
    const data = { ...sampleWordData, simplePhonetic: null };
    const cards = buildCards(data);
    expect(cards.find((c) => c.type === "pronunciation")).toBeUndefined();
  });

  it("produces a cloze card from exampleSentence", () => {
    const cards = buildCards(sampleWordData);
    const cloze = cards.find((c) => c.type === "cloze");
    expect(cloze).toBeDefined();
    expect(cloze!.front).toContain("_____");
    expect(cloze!.back).toBe("ephemeral");
  });

  it("skips cloze when no sentence available", () => {
    const data = { ...sampleWordData, exampleSentence: null };
    const cards = buildCards(data);
    expect(cards.find((c) => c.type === "cloze")).toBeUndefined();
  });

  it("produces an etymology card when etymology is available", () => {
    const cards = buildCards(sampleWordData);
    const etym = cards.find((c) => c.type === "etymology");
    expect(etym).toBeDefined();
    expect(etym!.back).toContain("Greek");
  });

  it("skips etymology card when etymology is null", () => {
    const data = { ...sampleWordData, etymology: null };
    const cards = buildCards(data);
    expect(cards.find((c) => c.type === "etymology")).toBeUndefined();
  });

  it("definition back contains only the primary definition", () => {
    const cards = buildCards(sampleWordData);
    const def = cards.find((c) => c.type === "definition")!;
    expect(def.back).toBe("(adjective) lasting for a very short time");
    expect(def.back).not.toContain("(noun) an ephemeral plant");
  });
});

const sampleConceptData: WordData = {
  word: "dialectic",
  definition: "(noun) a method of argument through contradictory positions",
  allDefinitions: ["(noun) a method of argument through contradictory positions"],
  simplePhonetic: "dy-uh-LEK-tik",
  audioUrl: null,
  exampleSentence: "The dialectic between freedom and order shapes every political philosophy.",
  etymology: "From Greek dialektikē (technē), art of debate",
  connotation: "Associated with Hegel and Marx; signals philosophical or ideological discourse.",
  implication: "Suggests that truth emerges through the tension of opposing ideas rather than settled doctrine.",
};

describe("buildCards (concept entry type)", () => {
  it("produces definition, cloze, etymology, and implication cards", () => {
    const cards = buildCards(sampleConceptData, "concept");
    expect(cards.find((c) => c.type === "definition")).toBeDefined();
    expect(cards.find((c) => c.type === "cloze")).toBeDefined();
    expect(cards.find((c) => c.type === "etymology")).toBeDefined();
    expect(cards.find((c) => c.type === "implication")).toBeDefined();
  });

  it("does not produce pronunciation or connotation cards", () => {
    const cards = buildCards(sampleConceptData, "concept");
    expect(cards.find((c) => c.type === "pronunciation")).toBeUndefined();
    expect(cards.find((c) => c.type === "connotation")).toBeUndefined();
  });

  it("implication card front asks about broader significance", () => {
    const cards = buildCards(sampleConceptData, "concept");
    const impl = cards.find((c) => c.type === "implication")!;
    expect(impl.front).toContain("dialectic");
    expect(impl.back).toContain("opposing ideas");
  });

  it("skips implication card when implication is null", () => {
    const data = { ...sampleConceptData, implication: null };
    const cards = buildCards(data, "concept");
    expect(cards.find((c) => c.type === "implication")).toBeUndefined();
  });
});
