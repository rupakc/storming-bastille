"use client";

import { ExternalLink, Star } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { Citation } from "@/lib/types";

interface SourceCitationsProps {
  citations: Citation[];
}

export function SourceCitations({ citations }: SourceCitationsProps) {
  if (citations.length === 0) return null;

  return (
    <div className="px-5 py-4">
      <div className="space-y-2.5">
        {citations.map((citation, i) => (
          <motion.div
            key={citation.url + i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.04 }}
          >
            <a
              href={citation.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 p-3 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors line-clamp-1">
                  {citation.title || citation.url}
                </p>
                {citation.snippet && (
                  <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed line-clamp-2">
                    {citation.snippet}
                  </p>
                )}
                <p className="text-[10px] text-[var(--text-muted)] truncate mt-1">
                  {citation.url}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0 mt-0.5">
                {citation.relevance_score != null && citation.relevance_score > 0 && (
                  <span
                    className={cn(
                      "flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded",
                      citation.relevance_score >= 0.8
                        ? "bg-[var(--color-cat-economic)]/15 text-[var(--color-cat-economic)]"
                        : citation.relevance_score >= 0.5
                        ? "bg-[var(--color-gold-400)]/15 text-[var(--color-gold-500)]"
                        : "bg-[var(--bg-secondary)] text-[var(--text-muted)]"
                    )}
                  >
                    <Star size={9} />
                    {Math.round(citation.relevance_score * 100)}%
                  </span>
                )}
                <ExternalLink
                  size={14}
                  className="text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors"
                />
              </div>
            </a>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
