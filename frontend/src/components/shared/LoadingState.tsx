"use client";

import { cn } from "@/lib/utils";

type Variant = "search" | "results" | "graph";

export function LoadingState({ variant = "results" }: { variant?: Variant }) {
  if (variant === "search") {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-4 p-8">
        <div className="skeleton h-12 w-full" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (variant === "graph") {
    return (
      <div className="w-full h-full p-6 space-y-3">
        <div className="flex gap-4 items-center">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="skeleton h-16 w-40 rounded-lg" />
              {i < 2 && <div className="skeleton h-0.5 w-12" />}
            </div>
          ))}
        </div>
        <div className="flex gap-4 items-center ml-20 mt-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="skeleton h-16 w-40 rounded-lg" />
              {i < 1 && <div className="skeleton h-0.5 w-12" />}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // results variant
  return (
    <div className="w-full space-y-6 p-6">
      {/* Status bar */}
      <div className="flex items-center gap-3">
        <div className="skeleton h-3 w-3 rounded-full" />
        <div className="skeleton h-4 w-48" />
      </div>

      {/* Narrative skeleton */}
      <div className="space-y-3">
        <div className="skeleton h-6 w-3/4" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-5/6" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-2/3" />
      </div>

      {/* Sources skeleton */}
      <div className="space-y-2 mt-8">
        <div className="skeleton h-5 w-24" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton h-10 w-full" />
        ))}
      </div>
    </div>
  );
}

export function StatusIndicator({
  phase,
  message,
}: {
  phase: string;
  message: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
      <div className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--accent)]" />
      </div>
      <span className="text-sm text-[var(--text-secondary)]">
        <span className="font-medium text-[var(--text-primary)] capitalize">
          {phase}
        </span>{" "}
        &mdash; {message}
      </span>
    </div>
  );
}
