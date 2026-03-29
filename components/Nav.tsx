"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

const links = [
  {
    href: "/add",
    label: "Add",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    ),
  },
  {
    href: "/study",
    label: "Study",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
  },
  {
    href: "/words",
    label: "Words",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
    ),
  },
];

export default function Nav() {
  const pathname = usePathname();
  const [dueCount, setDueCount] = useState(0);

  useEffect(() => {
    const pin = localStorage.getItem("vb_pin") ?? "";
    fetch("/api/stats", { headers: { "x-pin": pin } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setDueCount(d.dueNow); });
  }, [pathname]);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center px-4 h-14"
      style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}
    >
      {/* Wordmark → stats */}
      <Link
        href="/stats"
        className="text-lg font-semibold tracking-tight mr-auto transition-colors"
        style={{ color: pathname === "/stats" ? "var(--accent-fg)" : "var(--text)" }}
      >
        vocab
      </Link>

      {/* Links */}
      <div className="flex items-center gap-1">
        {links.map(({ href, label, icon }) => {
          const active = pathname === href || (href !== "/add" && pathname.startsWith(href + "/"));
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                color: active ? "var(--accent-fg)" : "var(--text-muted)",
                background: "transparent",
              }}
            >
              <span className="relative" style={{ opacity: active ? 1 : 0.5 }}>
                {icon}
                {href === "/study" && dueCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 flex items-center justify-center rounded-full font-bold"
                    style={{ width: 14, height: 14, fontSize: 9, background: "var(--accent)", color: "var(--bg)" }}
                  >
                    {dueCount > 99 ? "9+" : dueCount}
                  </span>
                )}
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
