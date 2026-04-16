/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import AddPage from "./page";

// Minimal mocks for next/link and browser APIs the component uses on mount
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

beforeEach(() => {
  // localStorage
  vi.stubGlobal("localStorage", {
    getItem: vi.fn(() => "1234"),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  });

  // fetch — return empty arrays to prevent errors on mount
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    })
  );
});

describe("Add page word input", () => {
  it("has spellCheck enabled on the word input", async () => {
    render(<AddPage />);
    const input = screen.getByPlaceholderText(/word|concept/i);
    // spellcheck attribute: "true" or absent means enabled; "false" means disabled
    expect(input).not.toHaveAttribute("spellcheck", "false");
  });
});
