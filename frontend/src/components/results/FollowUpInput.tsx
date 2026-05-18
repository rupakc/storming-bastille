"use client";

import { useState, useCallback } from "react";
import { Send, Loader2 } from "lucide-react";

interface FollowUpInputProps {
  onSubmit: (query: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function FollowUpInput({
  onSubmit,
  isLoading = false,
  disabled = false,
}: FollowUpInputProps) {
  const [value, setValue] = useState("");

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = value.trim();
      if (trimmed && !isLoading && !disabled) {
        onSubmit(trimmed);
        setValue("");
      }
    },
    [value, isLoading, disabled, onSubmit]
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="px-6 py-4 border-t border-[var(--border-subtle)]"
    >
      <div className="flex items-center gap-2 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl px-4 py-2.5 focus-within:border-[var(--accent)] transition-colors">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ask a follow-up question..."
          disabled={disabled || isLoading}
          className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!value.trim() || isLoading || disabled}
          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
        </button>
      </div>
    </form>
  );
}
