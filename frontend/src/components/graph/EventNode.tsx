"use client";

import { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { motion, AnimatePresence } from "motion/react";
import { cn, categoryColor, formatDate } from "@/lib/utils";
import type { EventData } from "@/lib/types";

const categoryIcons: Record<string, string> = {
  political: "\u{1F3DB}",
  economic: "\u{1F4C8}",
  social: "\u{1F465}",
  military: "\u{2694}\uFE0F",
  cultural: "\u{1F3AD}",
};

function EventNodeComponent({ data, selected }: NodeProps) {
  const [hovered, setHovered] = useState(false);
  const eventData = data as unknown as EventData;
  const colors = categoryColor(eventData.category);
  const icon = categoryIcons[eventData.category?.toLowerCase()] || "\u{1F4CC}";
  const isPrimary = !!eventData.is_primary;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "event-node relative rounded-xl transition-all duration-150",
        isPrimary ? "w-[230px]" : "w-[200px]",
        isPrimary && !selected
          ? "ring-2 ring-[var(--accent)] shadow-[0_0_20px_rgba(212,169,52,0.3)]"
          : selected
          ? "ring-2 ring-[var(--accent)] shadow-[0_0_16px_rgba(212,169,52,0.25)]"
          : hovered
          ? "shadow-[0_6px_24px_rgba(0,0,0,0.12)] scale-[1.02]"
          : "shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
      )}
    >
      {/* Gradient top accent bar — gold for primary, category color otherwise */}
      <div
        className={cn(
          "absolute inset-x-0 top-0 rounded-t-xl",
          isPrimary ? "h-[4px] bg-gradient-to-r from-[var(--accent)] to-[#e6c05c]" : "h-[3px]",
          !isPrimary && eventData.category?.toLowerCase() === "political" && "bg-gradient-to-r from-[#3a6bb5] to-[#6b9dd4]",
          !isPrimary && eventData.category?.toLowerCase() === "economic" && "bg-gradient-to-r from-[#4a8e5f] to-[#7bb88f]",
          !isPrimary && eventData.category?.toLowerCase() === "social" && "bg-gradient-to-r from-[#c4802a] to-[#e4a85a]",
          !isPrimary && eventData.category?.toLowerCase() === "military" && "bg-gradient-to-r from-[#b44a4a] to-[#d47a7a]",
          !isPrimary && eventData.category?.toLowerCase() === "cultural" && "bg-gradient-to-r from-[#7b5b9f] to-[#ab8bcf]",
          !isPrimary && !["political", "economic", "social", "military", "cultural"].includes(eventData.category?.toLowerCase() || "") && "bg-gradient-to-r from-[var(--border-color)] to-[var(--text-muted)]"
        )}
      />

      {/* Card body */}
      <div className={cn(
        "bg-[var(--bg-card)] rounded-xl overflow-hidden",
        isPrimary
          ? "border-2 border-[var(--accent)]/40"
          : "border border-[var(--border-subtle)]"
      )}>
        <div className="px-3 py-2.5">
          {/* Primary event badge */}
          {isPrimary && (
            <div className="flex items-center gap-1 mb-1.5">
              <span className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/25">
                ★ Primary Event
              </span>
            </div>
          )}

          {/* Top row: icon + category + date */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-xs leading-none">{icon}</span>
            <span className={cn(
              "text-[9px] font-bold uppercase tracking-wider px-1.5 py-px rounded-full",
              colors.bg, colors.text
            )}>
              {eventData.category}
            </span>
            <span className="ml-auto text-[9px] text-[var(--text-muted)] font-medium tabular-nums whitespace-nowrap">
              {eventData.date && formatDate(eventData.date)}
            </span>
          </div>

          {/* Title */}
          <h3 className={cn(
            "font-semibold text-[var(--text-primary)] leading-tight line-clamp-2 font-[family-name:var(--font-display)]",
            isPrimary ? "text-[13px]" : "text-[12px]"
          )}>
            {eventData.title}
          </h3>
        </div>
      </div>

      {/* Hover detail card */}
      <AnimatePresence>
        {hovered && eventData.description && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 w-72 p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] shadow-[0_8px_30px_rgba(0,0,0,0.18)]"
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-[10px]">{icon}</span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                {formatDate(eventData.date)}
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
              {eventData.description}
            </p>
            {/* Arrow */}
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-[var(--bg-card)] border-l border-t border-[var(--border-color)]" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Connection handles — all 4 sides for LR and TB layout support */}
      <Handle
        type="target"
        position={Position.Top}
        id="target-top"
        className="!w-2 !h-2 !bg-[var(--border-color)] !border-[1.5px] !border-[var(--bg-card)] !-top-1 !opacity-0"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="source-bottom"
        className="!w-2 !h-2 !bg-[var(--border-color)] !border-[1.5px] !border-[var(--bg-card)] !-bottom-1 !opacity-0"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="target-left"
        className="!w-2 !h-2 !bg-[var(--border-color)] !border-[1.5px] !border-[var(--bg-card)] !-left-1 !opacity-0"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="source-right"
        className="!w-2 !h-2 !bg-[var(--border-color)] !border-[1.5px] !border-[var(--bg-card)] !-right-1 !opacity-0"
      />
    </motion.div>
  );
}

export const EventNode = memo(EventNodeComponent);
