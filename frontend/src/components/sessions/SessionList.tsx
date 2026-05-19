"use client";

import { AnimatePresence } from "motion/react";
import { SessionCard } from "./SessionCard";
import { Inbox } from "lucide-react";
import type { SessionSummary } from "@/lib/types";

interface SessionListProps {
  sessions: SessionSummary[];
  loading: boolean;
  onDelete: (id: string) => void;
}

export function SessionList({ sessions, loading, onDelete }: SessionListProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)]">
        <Inbox size={48} strokeWidth={1} className="mb-4 opacity-50" />
        <p className="text-lg font-medium">No saved sessions yet</p>
        <p className="text-sm mt-1">
          Your saved research sessions will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <AnimatePresence>
        {sessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            onDelete={onDelete}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
