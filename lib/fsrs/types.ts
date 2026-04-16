export type Rating = 1 | 2 | 3 | 4; // Again | Hard | Good | Easy

export interface CardState {
  stability: number;   // S: days until 90% retention
  difficulty: number;  // D: 1–10, higher = harder
  reps: number;        // number of successful reviews
  lapses: number;      // number of Again ratings
  lastRating: Rating | null;
  lastReview: Date | null;
  nextReview: Date;
}

export interface ReviewResult {
  nextState: CardState;
  intervalDays: number;
}

// FSRS-5 default weights
export const DEFAULT_WEIGHTS: readonly number[] = [
  0.4072, 1.1829, 3.1262, 5.0,     // w0–w3: initial stability per rating (w3 reduced from 15.47 — easier first-review intervals)
  7.2102,  // w4: initial difficulty
  0.5316,  // w5: difficulty delta
  1.0651,  // w6
  0.0589,  // w7
  1.469,   // w8
  0.1544,  // w9
  1.0071,  // w10
  1.9395,  // w11
  0.1100,  // w12
  0.2900,  // w13
  2.2700,  // w14
  0.2500,  // w15
  2.9898,  // w16
  0.5100,  // w17
  0.3400,  // w18
] as const;

export const DECAY = -0.5;
export const FACTOR = 19 / 81; // = 0.234..., derived from DECAY
export const TARGET_RETENTION = 0.9;
