"use client";

import { useState, useEffect } from "react";

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// Centered modal dialog for editing a single generation-prompt field — bigger
// than an inline textarea (which felt cramped for real editing), but bounded
// rather than a full-viewport takeover (which just left a huge empty page
// under a couple of lines of text).
export default function PromptEditorModal({
  label,
  value,
  maxLength,
  onClose,
  onSave,
  onReset,
  busy = false,
}: {
  label: string;
  value: string;
  maxLength: number;
  onClose: () => void;
  onSave: (value: string) => void;
  onReset?: () => void;
  busy?: boolean;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "color-mix(in srgb, black 65%, transparent)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", maxHeight: "min(80vh, 40rem)" }}
      >
        <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          <span className="text-sm font-medium" style={{ color: "var(--text)" }}>{label}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 -mr-1"
            style={{ color: "var(--text-muted)" }}
          >
            <CloseIcon />
          </button>
        </div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={maxLength}
          autoFocus
          rows={maxLength > 500 ? 10 : 6}
          className="w-full px-4 py-3 resize-none outline-none"
          style={{ background: "var(--surface)", color: "var(--text)", fontSize: "1rem", lineHeight: 1.6 }}
        />
        <div className="flex items-center justify-between gap-3 px-4 py-3 shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
          {onReset ? (
            <button type="button" onClick={onReset} disabled={busy} className="text-sm" style={{ color: "var(--text-muted)" }}>
              Reset to default
            </button>
          ) : <span />}
          <button
            type="button"
            onClick={() => onSave(draft)}
            disabled={busy}
            className="btn-primary"
            style={{ width: "auto", paddingLeft: "1.5rem", paddingRight: "1.5rem" }}
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
