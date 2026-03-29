"use client";

import { useState, useRef, useEffect } from "react";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[]; // existing tags from the word list
}

export default function TagInput({ value, onChange, suggestions = [] }: TagInputProps) {
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const inputTrimmed = input.trim().toLowerCase();

  // Suggestions: existing tags not already selected, filtered by input
  const filtered = suggestions.filter(
    (s) => !value.includes(s) && (inputTrimmed === "" || s.toLowerCase().includes(inputTrimmed))
  );

  // Show "create new" option if input isn't empty and not already a tag
  const canCreate = inputTrimmed !== "" && !value.includes(inputTrimmed) && !suggestions.includes(inputTrimmed);

  function addTag(tag: string) {
    const t = tag.trim().toLowerCase();
    if (t && !value.includes(t)) onChange([...value, t]);
    setInput("");
    setOpen(false);
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === "Enter" || e.key === ",") && inputTrimmed) {
      e.preventDefault();
      addTag(inputTrimmed);
    } else if (e.key === "Backspace" && input === "" && value.length > 0) {
      removeTag(value[value.length - 1]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const showDropdown = open && (filtered.length > 0 || canCreate);

  return (
    <div ref={containerRef} className="relative">
      <div
        className="input-field flex flex-wrap gap-1.5 min-h-[42px] cursor-text"
        onClick={() => { setOpen(true); containerRef.current?.querySelector("input")?.focus(); }}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 bg-stone-800 text-white text-xs px-2 py-0.5 rounded-full"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
              className="hover:text-stone-300 leading-none"
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? "Add tags…" : ""}
          className="flex-1 min-w-[80px] outline-none bg-transparent text-sm placeholder:text-stone-300"
          autoCapitalize="none"
          autoCorrect="off"
        />
      </div>

      {showDropdown && (
        <ul className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-stone-200 rounded-lg shadow-md overflow-hidden text-sm">
          {filtered.map((tag) => (
            <li key={tag}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); addTag(tag); }}
                className="w-full text-left px-3 py-2 hover:bg-stone-50 text-stone-700"
              >
                {tag}
              </button>
            </li>
          ))}
          {canCreate && (
            <li>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); addTag(inputTrimmed); }}
                className="w-full text-left px-3 py-2 hover:bg-stone-50 text-stone-500"
              >
                Create <span className="font-medium text-stone-800">"{inputTrimmed}"</span>
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
