"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn, categoryColor, formatDate } from "@/lib/utils";
import type { TimelineEvent as TimelineEventType } from "@/lib/types";

interface TimelineEventProps {
  event: TimelineEventType;
  style?: React.CSSProperties;
  onClick?: (id: string) => void;
}

export function TimelineEventDot({ event, style, onClick }: TimelineEventProps) {
  const [hovered, setHovered] = useState(false);
  const colors = categoryColor(event.category);

  return (
    <div
      className="absolute flex flex-col items-center cursor-pointer"
      style={style}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onClick?.(event.id)}
    >
      {/* Dot — always visible */}
      <motion.div
        whileHover={{ scale: 1.6 }}
        className={cn(
          "w-3 h-3 rounded-full border-2 border-[var(--bg-card)] shadow-sm z-10 transition-shadow",
          colors.dot,
          hovered && "shadow-md"
        )}
      />

      {/* Tooltip — appears on hover */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full mt-2 z-50 w-60 p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] shadow-xl pointer-events-none"
          >
            <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1">
              {formatDate(event.date)}
            </p>
            <p className="text-xs font-semibold text-[var(--text-primary)] leading-snug">
              {event.title}
            </p>
            {event.description && (
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed mt-1.5 line-clamp-3">
                {event.description}
              </p>
            )}
            <span
              className={cn(
                "inline-block mt-2 text-[9px] font-semibold px-1.5 py-0.5 rounded-full",
                colors.bg,
                colors.text
              )}
            >
              {event.category}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
