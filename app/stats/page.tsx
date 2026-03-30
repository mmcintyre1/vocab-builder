"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

function getPin(): string {
  return localStorage.getItem("vb_pin") ?? "";
}

interface Stats {
  reviewedToday: number;
  totalReviews: number;
  totalWords: number;
  dueNow: number;
  streak: number;
  last7Days: boolean[];
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl px-4 py-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{label}</span>
      <span className="text-3xl font-semibold tracking-tight" style={{ color: "var(--text)" }}>{value}</span>
      {sub && <span className="text-xs" style={{ color: "var(--text-muted)" }}>{sub}</span>}
    </div>
  );
}

function StreakCard({ streak, last7Days }: { streak: number; last7Days: boolean[] }) {
  // Reverse so today is leftmost — streak tallies left to right
  const dots = [...last7Days].reverse();
  return (
    <div className="flex flex-col gap-1 rounded-xl px-4 py-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Streak</span>
      <span className="text-3xl font-semibold tracking-tight" style={{ color: "var(--text)" }}>
        {streak === 0 ? "—" : `${streak}d`}
      </span>
      <div className="flex gap-1 mt-1">
        {dots.map((active, i) => (
          <div
            key={i}
            className="rounded-full"
            style={{ width: 8, height: 8, background: active ? "var(--accent-fg)" : "var(--border)" }}
          />
        ))}
      </div>
    </div>
  );
}

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/stats", { headers: { "x-pin": getPin() } });
      if (res.ok) setStats(await res.json());
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <div className="skeleton h-8 w-20 rounded mb-1" />
          <div className="skeleton h-4 w-32 rounded" />
        </div>
        <div className="skeleton h-14 rounded-xl" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="flex flex-col gap-6">
      {/* Home header */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight" style={{ color: "var(--text)" }}>vocab</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
          {stats.totalWords} word{stats.totalWords !== 1 ? "s" : ""} · {stats.totalReviews} reviews
        </p>
      </div>

      {/* Primary CTA — always visible, dimmed when nothing due */}
      <Link
        href="/study"
        className="btn-primary text-center block"
        style={stats.dueNow === 0 ? { opacity: 0.4, pointerEvents: "none" } : {}}
      >
        {stats.dueNow > 0
          ? `Study ${stats.dueNow} due card${stats.dueNow !== 1 ? "s" : ""} →`
          : "All caught up"}
      </Link>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StreakCard streak={stats.streak} last7Days={stats.last7Days} />
        <StatCard
          label="Today"
          value={stats.reviewedToday}
          sub="cards reviewed"
        />
        <StatCard
          label="Due now"
          value={stats.dueNow}
          sub={stats.dueNow > 0 ? "ready to study" : "all clear"}
        />
        <StatCard
          label="Words"
          value={stats.totalWords}
          sub={`${stats.totalReviews} total reviews`}
        />
      </div>
    </div>
  );
}
