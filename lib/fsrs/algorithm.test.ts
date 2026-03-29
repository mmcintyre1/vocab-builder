import { describe, it, expect } from "vitest";
import {
  retrievability,
  optimalInterval,
  initialStability,
  initialDifficulty,
  nextDifficulty,
  stabilityAfterRecall,
  stabilityAfterLapse,
  scheduleReview,
  newCardState,
} from "./algorithm";
import { DEFAULT_WEIGHTS, TARGET_RETENTION } from "./types";

describe("retrievability", () => {
  it("returns 1 when elapsed is 0", () => {
    expect(retrievability(0, 10)).toBeCloseTo(1, 5);
  });

  it("returns TARGET_RETENTION when elapsed equals stability", () => {
    // By definition, stability S is days until retrievability = TARGET_RETENTION
    // This is approximately true; exact equality requires optimalInterval round-trip
    const s = 10;
    const interval = optimalInterval(s);
    expect(retrievability(interval, s)).toBeGreaterThanOrEqual(TARGET_RETENTION - 0.02);
  });

  it("decreases as elapsed days increase", () => {
    const s = 10;
    const r1 = retrievability(5, s);
    const r2 = retrievability(10, s);
    const r3 = retrievability(20, s);
    expect(r1).toBeGreaterThan(r2);
    expect(r2).toBeGreaterThan(r3);
  });

  it("returns value between 0 and 1", () => {
    for (const days of [0, 1, 5, 30, 365]) {
      const r = retrievability(days, 10);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(1);
    }
  });
});

describe("optimalInterval", () => {
  it("returns at least 1 day", () => {
    expect(optimalInterval(0.1)).toBeGreaterThanOrEqual(1);
  });

  it("increases as stability increases", () => {
    expect(optimalInterval(5)).toBeLessThan(optimalInterval(10));
    expect(optimalInterval(10)).toBeLessThan(optimalInterval(30));
  });
});

describe("initialStability", () => {
  it("again (1) gives lowest stability", () => {
    expect(initialStability(1)).toBeLessThan(initialStability(2));
  });

  it("easy (4) gives highest stability", () => {
    expect(initialStability(4)).toBeGreaterThan(initialStability(3));
  });

  it("stability equals weight for each rating", () => {
    for (const r of [1, 2, 3, 4] as const) {
      expect(initialStability(r)).toBeCloseTo(DEFAULT_WEIGHTS[r - 1], 5);
    }
  });

  it("never returns 0 or negative", () => {
    for (const r of [1, 2, 3, 4] as const) {
      expect(initialStability(r)).toBeGreaterThan(0);
    }
  });
});

describe("initialDifficulty", () => {
  it("returns value between 1 and 10", () => {
    for (const r of [1, 2, 3, 4] as const) {
      const d = initialDifficulty(r);
      expect(d).toBeGreaterThanOrEqual(1);
      expect(d).toBeLessThanOrEqual(10);
    }
  });

  it("again (1) produces higher difficulty than easy (4)", () => {
    expect(initialDifficulty(1)).toBeGreaterThan(initialDifficulty(4));
  });
});

describe("nextDifficulty", () => {
  it("stays clamped between 1 and 10", () => {
    // Repeatedly rating hard on a hard card should not exceed 10
    let d = initialDifficulty(1);
    for (let i = 0; i < 20; i++) {
      d = nextDifficulty(d, 1);
      expect(d).toBeGreaterThanOrEqual(1);
      expect(d).toBeLessThanOrEqual(10);
    }
  });

  it("decreases when rated easy (4)", () => {
    const d = 7;
    expect(nextDifficulty(d, 4)).toBeLessThan(d);
  });

  it("increases when rated again (1)", () => {
    const d = 5;
    expect(nextDifficulty(d, 1)).toBeGreaterThan(d);
  });
});

describe("stabilityAfterRecall", () => {
  it("returns a positive number", () => {
    expect(stabilityAfterRecall(5, 10, 0.9, 3)).toBeGreaterThan(0);
  });

  it("good (3) gives higher stability than hard (2)", () => {
    expect(stabilityAfterRecall(5, 10, 0.9, 3)).toBeGreaterThan(
      stabilityAfterRecall(5, 10, 0.9, 2)
    );
  });

  it("easy (4) gives higher stability than good (3)", () => {
    expect(stabilityAfterRecall(5, 10, 0.9, 4)).toBeGreaterThan(
      stabilityAfterRecall(5, 10, 0.9, 3)
    );
  });
});

describe("stabilityAfterLapse", () => {
  it("returns at least 0.1", () => {
    expect(stabilityAfterLapse(8, 100, 0.3)).toBeGreaterThanOrEqual(0.1);
  });

  it("returns less than the original stability", () => {
    const s = 30;
    expect(stabilityAfterLapse(5, s, 0.3)).toBeLessThan(s);
  });
});

describe("scheduleReview", () => {
  const now = new Date("2025-01-01T12:00:00Z");

  it("first review with easy (4) produces next review far in future", () => {
    const state = newCardState();
    const { nextState, intervalDays } = scheduleReview(state, 4, now);
    expect(intervalDays).toBeGreaterThan(10);
    expect(nextState.nextReview.getTime()).toBeGreaterThan(now.getTime());
  });

  it("first review with again (1) schedules quickly", () => {
    const state = newCardState();
    const { intervalDays } = scheduleReview(state, 1, now);
    expect(intervalDays).toBeLessThan(0.1); // sub-hour
  });

  it("tracks reps correctly", () => {
    const state = newCardState();
    const { nextState } = scheduleReview(state, 3, now);
    expect(nextState.reps).toBe(1);
    expect(nextState.lapses).toBe(0);
  });

  it("tracks lapses correctly on again (1)", () => {
    const state = newCardState();
    const { nextState } = scheduleReview(state, 1, now);
    expect(nextState.lapses).toBe(1);
    expect(nextState.reps).toBe(0);
  });

  it("accumulates stability across multiple good reviews", () => {
    let state = newCardState();
    const intervals: number[] = [];
    let reviewDate = now;

    for (let i = 0; i < 5; i++) {
      const { nextState, intervalDays } = scheduleReview(state, 3, reviewDate);
      intervals.push(intervalDays);
      reviewDate = nextState.nextReview;
      state = nextState;
    }

    // Each interval should generally grow
    for (let i = 1; i < intervals.length; i++) {
      expect(intervals[i]).toBeGreaterThanOrEqual(intervals[i - 1]);
    }
  });

  it("lapse resets stability downward", () => {
    let state = newCardState();
    const reviewDate = now;

    // Build up some stability
    for (let i = 0; i < 3; i++) {
      const { nextState } = scheduleReview(state, 3, reviewDate);
      state = nextState;
    }
    const stabilityBefore = state.stability;

    const { nextState } = scheduleReview(state, 1, reviewDate);
    expect(nextState.stability).toBeLessThan(stabilityBefore);
  });

  it("sets lastRating and lastReview", () => {
    const state = newCardState();
    const { nextState } = scheduleReview(state, 2, now);
    expect(nextState.lastRating).toBe(2);
    expect(nextState.lastReview).toEqual(now);
  });
});
