import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { checkPin, getPinFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const pin = getPinFromRequest(request);
  if (!checkPin(pin)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();

  // Today's reviews
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const { count: reviewedToday } = await supabase
    .from("reviews")
    .select("*", { count: "exact", head: true })
    .gte("reviewed_at", todayStart.toISOString());

  // Total reviews ever
  const { count: totalReviews } = await supabase
    .from("reviews")
    .select("*", { count: "exact", head: true });

  // Total words
  const { count: totalWords } = await supabase
    .from("words")
    .select("*", { count: "exact", head: true });

  // Due now
  const { count: dueNow } = await supabase
    .from("cards")
    .select("*", { count: "exact", head: true })
    .lte("next_review", now.toISOString());

  // Streak: count consecutive days with at least one review
  // Fetch distinct review dates in descending order
  const { data: reviewDays } = await supabase
    .from("reviews")
    .select("reviewed_at")
    .order("reviewed_at", { ascending: false });

  const uniqueDays = reviewDays
    ? Array.from(new Set(reviewDays.map((r) => r.reviewed_at.slice(0, 10))))
    : [];

  // Streak: count consecutive days with at least one review
  let streak = 0;
  if (uniqueDays.length > 0) {
    const todayStr = now.toISOString().slice(0, 10);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    if (uniqueDays[0] === todayStr || uniqueDays[0] === yesterdayStr) {
      streak = 1;
      let expected = new Date(uniqueDays[0]);
      for (let i = 1; i < uniqueDays.length; i++) {
        const prev = new Date(expected);
        prev.setDate(prev.getDate() - 1);
        if (uniqueDays[i] === prev.toISOString().slice(0, 10)) {
          streak++;
          expected = prev;
        } else {
          break;
        }
      }
    }
  }

  // Last 7 days activity (oldest → newest)
  const last7Days: boolean[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    last7Days.push(uniqueDays.includes(d.toISOString().slice(0, 10)));
  }

  return NextResponse.json({
    reviewedToday: reviewedToday ?? 0,
    totalReviews: totalReviews ?? 0,
    totalWords: totalWords ?? 0,
    dueNow: dueNow ?? 0,
    streak,
    last7Days,
  });
}
