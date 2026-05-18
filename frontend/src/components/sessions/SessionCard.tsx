"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Trash2, Clock, MessageSquare } from "lucide-react";
import { motion } from "motion/react";
import { formatDate } from "@/lib/utils";
import type { SessionSummary } from "@/lib/types";

interface SessionCardProps {
  session: SessionSummary;
  onDelete: (id: string) => void;
}

export function SessionCard({ session, onDelete }: SessionCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (confirmDelete) {
        onDelete(session.id);
      } else {
        setConfirmDelete(true);
        setTimeout(() => setConfirmDelete(false), 3000);
      }
    },
    [confirmDelete, session.id, onDelete]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      layout
    >
      <Link
        href={`/sessions/${session.id}`}
        className="block p-5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--border-color)] shadow-sm hover:shadow-md transition-all duration-200 group"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[var(--text-primary)] font-[family-name:var(--font-display)] line-clamp-1 group-hover:text-[var(--accent)] transition-colors">
              {session.title}
            </h3>

            <div className="flex items-center gap-4 mt-2 text-xs text-[var(--text-muted)]">
              <span className="flex items-center gap-1">
                <MessageSquare size={12} />
                {session.query_count} {session.query_count === 1 ? "query" : "queries"}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {formatDate(session.updated_at)}
              </span>
            </div>
          </div>

          <button
            onClick={handleDelete}
            className={`shrink-0 p-2 rounded-lg transition-colors ${
              confirmDelete
                ? "bg-red-500/15 text-red-500"
                : "text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10"
            }`}
            title={confirmDelete ? "Click again to confirm" : "Delete session"}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </Link>
    </motion.div>
  );
}
