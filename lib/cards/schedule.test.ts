import { describe, it, expect } from "vitest";
import { nextDueDate, daysUntilLabel } from "./schedule";

const DAY = 86_400_000;

describe("nextDueDate", () => {
  it("returns null for empty array", () => {
    expect(nextDueDate([])).toBeNull();
  });

  it("returns null when all cards are already due", () => {
    const past = new Date(Date.now() - DAY).toISOString();
    expect(nextDueDate([{ next_review: past }])).toBeNull();
  });

  it("returns soonest future review from mixed array", () => {
    const past = new Date(Date.now() - DAY).toISOString();
    const tomorrow = new Date(Date.now() + DAY).toISOString();
    const nextWeek = new Date(Date.now() + 7 * DAY).toISOString();
    const result = nextDueDate([
      { next_review: past },
      { next_review: nextWeek },
      { next_review: tomorrow },
    ]);
    expect(result).toBe(tomorrow);
  });

  it("returns the only future date when only one card is future", () => {
    const future = new Date(Date.now() + 3 * DAY).toISOString();
    expect(nextDueDate([{ next_review: future }])).toBe(future);
  });
});

describe("daysUntilLabel", () => {
  it("returns 'today' for 0 days", () => {
    expect(daysUntilLabel(0)).toBe("today");
  });

  it("returns 'tomorrow' for 1 day", () => {
    expect(daysUntilLabel(1)).toBe("tomorrow");
  });

  it("returns 'in N days' for N > 1", () => {
    expect(daysUntilLabel(5)).toBe("in 5 days");
  });
});
