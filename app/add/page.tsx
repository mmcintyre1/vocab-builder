"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Mode = "single" | "bulk";

interface Result {
  word: string;
  id?: string;
  cardCount?: number;
  error?: string;
}

function getPin(): string {
  return localStorage.getItem("vb_pin") ?? "";
}

export default function AddPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("single");

  const [word, setWord] = useState("");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");
  const [bulkText, setBulkText] = useState("");

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [errors, setErrors] = useState<Result[]>([]);
  const [allSources, setAllSources] = useState<string[]>([]);

  useEffect(() => {
    async function loadSources() {
      const res = await fetch("/api/words", { headers: { "x-pin": getPin() } });
      if (!res.ok) return;
      const data: { source: string | null }[] = await res.json();
      setAllSources(
        Array.from(new Set(data.map((w) => w.source).filter(Boolean) as string[])).sort()
      );
    }
    loadSources();
  }, []);

  async function handleSingleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!word.trim()) return;
    setLoading(true);
    setResults([]);
    setErrors([]);

    const res = await fetch("/api/words", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-pin": getPin() },
      body: JSON.stringify({
        word: word.trim(),
        source: source.trim() || null,
        notes: notes.trim() || null,
      }),
    });
    const data = await res.json();
    setResults(data.results ?? []);
    setErrors(data.errors ?? []);
    setLoading(false);
    if ((data.results ?? []).length > 0) {
      setWord("");
      // Keep source populated — likely adding multiple words from the same source
    }
  }

  async function handleBulkSubmit(e: React.FormEvent) {
    e.preventDefault();
    const words = bulkText
      .split(/[\n,]+/)
      .map((w) => w.trim())
      .filter(Boolean);
    if (words.length === 0) return;

    setLoading(true);
    setResults([]);
    setErrors([]);

    const res = await fetch("/api/words", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-pin": getPin() },
      body: JSON.stringify({ words, source: source.trim() || null }),
    });
    const data = await res.json();
    setResults(data.results ?? []);
    setErrors(data.errors ?? []);
    setLoading(false);
    if ((data.results ?? []).length > 0) setBulkText("");
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight text-stone-800">Add words</h1>

      <div className="flex rounded-lg border border-stone-200 overflow-hidden w-fit">
        {(["single", "bulk"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setResults([]); setErrors([]); }}
            className={`px-5 py-1.5 text-sm font-medium capitalize transition-colors ${
              mode === m ? "bg-stone-800 text-white" : "bg-white text-stone-500 hover:bg-stone-50"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Source — shared between both modes, persists across adds */}
      <div className="relative">
        <input
          type="text"
          placeholder="Source (optional) — e.g. Moby Dick"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="input-field"
          list="source-suggestions"
        />
        <datalist id="source-suggestions">
          {allSources.map((s) => <option key={s} value={s} />)}
        </datalist>
      </div>

      {mode === "single" ? (
        <form onSubmit={handleSingleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Word"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            className="input-field"
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <textarea
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="input-field resize-none"
          />
          <button type="submit" disabled={loading || !word.trim()} className="btn-primary">
            {loading ? "Looking up…" : "Add word"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleBulkSubmit} className="flex flex-col gap-4">
          <textarea
            placeholder={"One word per line, or comma-separated:\nephemeral\npalliate\nsanguine"}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            rows={8}
            className="input-field resize-none font-mono text-sm"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <button type="submit" disabled={loading || !bulkText.trim()} className="btn-primary">
            {loading ? "Adding…" : "Add all"}
          </button>
        </form>
      )}

      {(results.length > 0 || errors.length > 0) && (
        <div className="flex flex-col gap-2 mt-2">
          {results.map((r) => (
            <div key={r.word} className="flex items-center justify-between text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <span className="font-medium text-green-800">{r.word}</span>
              <span className="text-green-600">{r.cardCount} cards created</span>
            </div>
          ))}
          {errors.map((e) => (
            <div key={e.word} className="flex items-center justify-between text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <span className="font-medium text-red-800">{e.word}</span>
              <span className="text-red-500">{e.error}</span>
            </div>
          ))}
          {results.length > 0 && (
            <button
              onClick={() => router.push("/study")}
              className="text-sm text-stone-500 underline underline-offset-2 text-center mt-1"
            >
              Go study →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
