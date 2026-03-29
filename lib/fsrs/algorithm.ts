import {
  CardState,
  Rating,
  ReviewResult,
  DEFAULT_WEIGHTS,
  DECAY,
  FACTOR,
  TARGET_RETENTION,
} from "./types";

const w = DEFAULT_WEIGHTS;

// Retrievability: probability of recall given elapsed days and stability S
export function retrievability(elapsedDays: number, stability: number): number {
  return Math.pow(1 + (FACTOR * elapsedDays) / stability, DECAY);
}

// Optimal interval for target retention given stability S
export function optimalInterval(stability: number, retention = TARGET_RETENTION): number {
  return Math.max(1, Math.round((stability / FACTOR) * (Math.pow(retention, 1 / DECAY) - 1)));
}

// Initial stability per rating (first review ever)
export function initialStability(rating: Rating): number {
  return Math.max(w[rating - 1], 0.1);
}

// Initial difficulty (first review ever)
export function initialDifficulty(rating: Rating): number {
  const d = w[4] - Math.exp(w[5] * (rating - 1)) + 1;
  return clampDifficulty(d);
}

// Difficulty after a review
export function nextDifficulty(d: number, rating: Rating): number {
  const deltaD = -w[6] * (rating - 3);
  const mean_reversion = w[7] * (initialDifficulty(3) - d); // mean-reversion toward neutral
  return clampDifficulty(d + deltaD + mean_reversion);
}

// Stability after a successful recall (rating >= 2)
export function stabilityAfterRecall(
  d: number,
  s: number,
  r: number,
  rating: Rating
): number {
  const hardPenalty = rating === 2 ? w[15] : 1;
  const easyBonus = rating === 4 ? w[16] : 1;
  return (
    s *
    (Math.exp(w[8]) *
      (11 - d) *
      Math.pow(s, -w[9]) *
      (Math.exp((1 - r) * w[10]) - 1) *
      hardPenalty *
      easyBonus +
      1)
  );
}

// Stability after a lapse (rating = 1, Again)
export function stabilityAfterLapse(d: number, s: number, r: number): number {
  return Math.max(
    w[11] * Math.pow(d, -w[12]) * (Math.pow(s + 1, w[13]) - 1) * Math.exp((1 - r) * w[14]),
    0.1
  );
}

function clampDifficulty(d: number): number {
  return Math.min(10, Math.max(1, d));
}

export function newCardState(): CardState {
  return {
    stability: 0,
    difficulty: 0,
    reps: 0,
    lapses: 0,
    lastRating: null,
    lastReview: null,
    nextReview: new Date(),
  };
}

export function scheduleReview(
  state: CardState,
  rating: Rating,
  now: Date = new Date()
): ReviewResult {
  let newStability: number;
  let newDifficulty: number;
  let newReps = state.reps;
  let newLapses = state.lapses;

  const isFirstReview = state.reps === 0;

  if (isFirstReview) {
    newStability = initialStability(rating);
    newDifficulty = initialDifficulty(rating);
    if (rating === 1) {
      newLapses += 1;
    } else {
      newReps += 1;
    }
  } else {
    const elapsedDays =
      state.lastReview
        ? Math.max(0, (now.getTime() - state.lastReview.getTime()) / 86400000)
        : 0;
    const r = retrievability(elapsedDays, state.stability);

    newDifficulty = nextDifficulty(state.difficulty, rating);

    if (rating === 1) {
      // Lapse
      newStability = stabilityAfterLapse(state.difficulty, state.stability, r);
      newLapses += 1;
    } else {
      newStability = stabilityAfterRecall(state.difficulty, state.stability, r, rating);
      newReps += 1;
    }
  }

  // For Again (1), re-schedule short-term: 1 min, 5 min (we'll use fractional days)
  let intervalDays: number;
  if (rating === 1) {
    intervalDays = 1 / (24 * 60); // 1 minute, effectively "now" in practice we show it again soon
  } else {
    intervalDays = Math.max(1, optimalInterval(newStability));
  }

  const nextReview = new Date(now.getTime() + intervalDays * 86400000);

  return {
    nextState: {
      stability: newStability,
      difficulty: newDifficulty,
      reps: newReps,
      lapses: newLapses,
      lastRating: rating,
      lastReview: now,
      nextReview,
    },
    intervalDays,
  };
}
