"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import * as d3 from "d3";
import { motion } from "motion/react";
import { TimelineEventDot } from "./TimelineEvent";
import type { TimelineEvent } from "@/lib/types";

interface TimelineProps {
  events: TimelineEvent[];
  onEventClick?: (id: string) => void;
}

function parseDate(dateStr: string): Date {
  // Handle partial dates
  if (/^\d{4}$/.test(dateStr)) return new Date(Number(dateStr), 0, 1);
  if (/^\d{4}-\d{2}$/.test(dateStr)) {
    const [y, m] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, 1);
  }
  return new Date(dateStr);
}

export function Timeline({ events, onEventClick }: TimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  // Observe container width
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setContainerWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Parse and sort events
  const sortedEvents = useMemo(() => {
    return events
      .map((e) => ({ ...e, _date: parseDate(e.date) }))
      .filter((e) => !isNaN(e._date.getTime()))
      .sort((a, b) => a._date.getTime() - b._date.getTime());
  }, [events]);

  // Calculate needed width: at least 120px per event, or container width — whichever is larger
  const contentWidth = useMemo(() => {
    const minPerEvent = 120;
    const needed = sortedEvents.length * minPerEvent + 120; // 120px padding
    return Math.max(needed, containerWidth);
  }, [sortedEvents.length, containerWidth]);

  // D3 time scale
  const scale = useMemo(() => {
    if (sortedEvents.length === 0) return null;

    const minDate = sortedEvents[0]._date;
    const maxDate = sortedEvents[sortedEvents.length - 1]._date;

    // Add some padding
    const padding = (maxDate.getTime() - minDate.getTime()) * 0.05 || 86400000;

    return d3
      .scaleTime()
      .domain([
        new Date(minDate.getTime() - padding),
        new Date(maxDate.getTime() + padding),
      ])
      .range([60, contentWidth - 60]);
  }, [sortedEvents, contentWidth]);

  if (events.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--text-muted)] text-xs">
        Timeline events will appear here
      </div>
    );
  }

  if (!scale) return null;

  return (
    <div
      ref={scrollRef}
      className="relative w-full h-full overflow-x-auto overflow-y-visible scrollbar-thin"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="relative h-full"
        style={{ width: contentWidth, minWidth: "100%" }}
      >
        {/* Timeline axis line */}
        <div
          className="absolute top-8 h-px bg-[var(--border-color)]"
          style={{ left: 40, width: contentWidth - 80 }}
        />

        {/* Tick marks */}
        {scale.ticks(Math.max(6, Math.floor(contentWidth / 120))).map((tick, i) => (
          <div
            key={i}
            className="absolute top-6 flex flex-col items-center"
            style={{ left: scale(tick) }}
          >
            <div className="w-px h-4 bg-[var(--border-color)]" />
            <span className="text-[8px] text-[var(--text-muted)] mt-0.5 whitespace-nowrap">
              {d3.timeFormat(
                tick.getMonth() === 0 && tick.getDate() === 1
                  ? "%Y"
                  : "%b %Y"
              )(tick)}
            </span>
          </div>
        ))}

        {/* Events — dots only, 3-row stagger to reduce overlap */}
        {sortedEvents.map((event, i) => {
          const x = scale(event._date);
          const row = i % 3;
          const yOffset = row === 0 ? 14 : row === 1 ? 38 : 62;

          return (
            <TimelineEventDot
              key={event.id}
              event={event}
              style={{
                left: x - 6,
                top: yOffset,
              }}
              onClick={onEventClick}
            />
          );
        })}
      </motion.div>
    </div>
  );
}
