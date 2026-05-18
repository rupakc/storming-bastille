"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, ArrowRight, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const PLACEHOLDERS = [
  "What caused the French Revolution?",
  "How did the assassination of Archduke Franz Ferdinand lead to WWI?",
  "What were the economic causes of the fall of the Roman Empire?",
  "How did the printing press change European politics?",
  "What events led to the American Civil War?",
  "How did the Black Death reshape European society?",
];

interface SearchBoxProps {
  onSubmit: (query: string) => void;
  isLoading?: boolean;
  initialValue?: string;
  autoFocus?: boolean;
}

export function SearchBox({
  onSubmit,
  isLoading = false,
  initialValue = "",
  autoFocus = false,
}: SearchBoxProps) {
  const [query, setQuery] = useState(initialValue);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cycle through placeholders
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Cmd+K shortcut to focus
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = query.trim();
      if (trimmed && !isLoading) {
        onSubmit(trimmed);
      }
    },
    [query, isLoading, onSubmit]
  );

  // Allow parent to set value (e.g., from presets)
  const setQueryValue = useCallback((value: string) => {
    setQuery(value);
  }, []);

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-2xl mx-auto">
      <div className="relative group">
        {/* Glow effect */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-[var(--color-gold-300)] via-[var(--color-slate-blue-300)] to-[var(--color-gold-300)] rounded-2xl opacity-0 group-focus-within:opacity-30 blur-md transition-opacity duration-500" />

        <div className="relative flex items-center bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-lg shadow-[hsl(var(--shadow-color)/0.08)] focus-within:border-[var(--accent)] transition-all duration-300">
          <Search
            size={20}
            className="ml-5 text-[var(--text-muted)] shrink-0"
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus={autoFocus}
            className="flex-1 px-4 py-4 bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none text-base"
            placeholder={PLACEHOLDERS[placeholderIdx]}
          />

          {/* Keyboard shortcut hint */}
          {!query && (
            <kbd className="hidden sm:flex items-center gap-0.5 mr-2 px-1.5 py-0.5 rounded text-[10px] font-medium text-[var(--text-muted)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
              <span className="text-xs">&#8984;</span>K
            </kbd>
          )}

          <button
            type="submit"
            disabled={!query.trim() || isLoading}
            className="mr-2 p-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all duration-200 hover:scale-105 active:scale-95"
          >
            {isLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <ArrowRight size={18} />
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
