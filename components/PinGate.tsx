"use client";

import { useState, useEffect } from "react";

const PIN_KEY = "vb_pin";

export default function PinGate({ children }: { children: React.ReactNode }) {
  const [pin, setPin] = useState<string | null>(null); // null = not yet checked
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(PIN_KEY);
    setPin(stored ?? "");
  }, []);

  if (pin === null) return null; // still reading localStorage — render nothing
  if (pin) return <>{children}</>;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const correct = process.env.NEXT_PUBLIC_APP_PIN;
    if (input === correct) {
      localStorage.setItem(PIN_KEY, input);
      setPin(input);
    } else {
      setError(true);
      setInput("");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg)" }}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-xs">
        <div className="text-center mb-2">
          <h1 className="text-3xl font-semibold tracking-tight" style={{ color: "var(--text)" }}>vocab</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Enter your PIN to continue</p>
        </div>
        <input
          type="password"
          inputMode="numeric"
          placeholder="PIN"
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(false); }}
          className="input-field text-center text-lg tracking-widest"
          style={{
            border: `1px solid ${error ? "#f87171" : "var(--border)"}`,
            boxShadow: error ? "0 0 0 2px color-mix(in srgb, #f87171 20%, transparent)" : undefined,
          }}
          autoFocus
        />
        {error && <p className="text-sm text-center -mt-1" style={{ color: "#f87171" }}>Incorrect PIN</p>}
        <button type="submit" className="btn-primary">
          Enter
        </button>
      </form>
    </div>
  );
}
