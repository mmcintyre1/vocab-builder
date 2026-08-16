"use client";

import { useState } from "react";

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export default function CollapsibleField({
  label,
  badge,
  value,
  onChange,
  maxLength,
  rows = 3,
  footer,
}: {
  label: string;
  badge?: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  rows?: number;
  footer?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border-subtle)" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-left transition-colors"
      >
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</span>
        <span className="flex items-center gap-2 shrink-0" style={{ color: "var(--text-muted)" }}>
          {badge && <span className="text-xs" style={{ color: "var(--accent-fg)" }}>{badge}</span>}
          <ChevronIcon open={open} />
        </span>
      </button>
      {open && (
        <div className="px-3 pb-3 flex flex-col gap-2">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={rows}
            maxLength={maxLength}
            autoFocus
            className="input-field resize-none text-xs"
          />
          {footer}
        </div>
      )}
    </div>
  );
}
