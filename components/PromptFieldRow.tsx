"use client";

function ChevronRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 6 15 12 9 18" />
    </svg>
  );
}

// A single row within a PromptSection's <ul divide-y> — no border of its own,
// the section card provides the boundary and the divide-y provides separation.
export default function PromptFieldRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors"
        style={{ color: "var(--text-muted)" }}
      >
        <span className="text-sm">{label}</span>
        <ChevronRightIcon />
      </button>
    </li>
  );
}
