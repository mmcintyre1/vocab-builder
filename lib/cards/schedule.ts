const DAY = 86_400_000;

/** Returns the ISO string of the soonest future next_review, or null if none are future. */
export function nextDueDate(cards: { next_review: string }[]): string | null {
  const now = Date.now();
  const future = cards
    .map((c) => c.next_review)
    .filter((d) => new Date(d).getTime() > now)
    .sort();
  return future[0] ?? null;
}

/** Human label for N days until next review. */
export function daysUntilLabel(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

/** Convert an ISO date string to a days-until label relative to now. */
export function isoToDaysLabel(iso: string): string {
  const days = Math.round((new Date(iso).getTime() - Date.now()) / DAY);
  return daysUntilLabel(Math.max(0, days));
}
