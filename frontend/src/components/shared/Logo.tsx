"use client";

import Link from "next/link";
import { Landmark } from "lucide-react";

export function Logo({ size = "default" }: { size?: "small" | "default" | "large" }) {
  const sizes = {
    small: { icon: 18, text: "text-lg" },
    default: { icon: 24, text: "text-2xl" },
    large: { icon: 36, text: "text-4xl md:text-5xl" },
  };
  const s = sizes[size];

  return (
    <Link href="/" className="flex items-center gap-2 group no-underline">
      <Landmark
        size={s.icon}
        className="text-[var(--accent)] transition-transform duration-300 group-hover:scale-110"
        strokeWidth={1.8}
      />
      <span
        className={`font-[family-name:var(--font-display)] ${s.text} font-bold tracking-tight text-[var(--text-primary)] transition-colors`}
      >
        Storming Bastille
      </span>
    </Link>
  );
}
