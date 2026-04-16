export type CardType = "definition" | "pronunciation" | "cloze" | "etymology" | "connotation" | "implication" | "context" | "significance";

export interface Word {
  id: string;
  word: string;
  source: string | null;
  tags: string[];
  notes: string | null;
  added_at: string;
  entry_type: "word" | "concept" | "reference";
}

export interface Card {
  id: string;
  word_id: string;
  type: CardType;
  front: string;
  back: string;
  created_at: string;
  // FSRS state
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  last_rating: number | null;
  last_review: string | null;
  next_review: string;
}

export interface Review {
  id: string;
  card_id: string;
  rating: number;
  reviewed_at: string;
}

export interface CardWithWord extends Card {
  words: Pick<Word, "word" | "source">;
}
