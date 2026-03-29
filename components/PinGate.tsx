"use client";

import { useState, useEffect } from "react";

const PIN_KEY = "vb_pin";

export default function PinGate({ children }: { children: React.ReactNode }) {
  const [pin, setPin] = useState("");
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(PIN_KEY);
    if (stored) setPin(stored);
  }, []);

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
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 items-center">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-800">vocab</h1>
        <input
          type="password"
          inputMode="numeric"
          placeholder="PIN"
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(false); }}
          className={`w-32 text-center border rounded-lg px-3 py-2 text-lg tracking-widest outline-none focus:ring-2 focus:ring-stone-400 ${
            error ? "border-red-400 bg-red-50" : "border-stone-300 bg-white"
          }`}
          autoFocus
        />
        {error && <p className="text-sm text-red-500">Incorrect PIN</p>}
        <button
          type="submit"
          className="px-6 py-2 bg-stone-800 text-white rounded-lg text-sm font-medium hover:bg-stone-700 transition-colors"
        >
          Enter
        </button>
      </form>
    </div>
  );
}
