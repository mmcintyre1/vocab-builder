"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/study", label: "Study" },
  { href: "/add", label: "Add" },
  { href: "/words", label: "Words" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 flex justify-around py-3 z-50 safe-area-pb">
      {links.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-0.5 text-xs font-medium px-4 py-1 rounded-lg transition-colors ${
              active ? "text-stone-900" : "text-stone-400 hover:text-stone-600"
            }`}
          >
            <span className={`text-lg leading-none ${active ? "opacity-100" : "opacity-40"}`}>
              {label === "Study" ? "◈" : label === "Add" ? "⊕" : "≡"}
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
