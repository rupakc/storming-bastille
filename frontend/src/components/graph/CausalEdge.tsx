"use client";

import { memo, useState } from "react";
import {
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import { cn } from "@/lib/utils";
import type { EdgeData } from "@/lib/types";

const typeConfig: Record<string, { dash?: string; color: string; label: string }> = {
  direct_cause: { color: "var(--color-cat-political)", label: "Direct Cause" },
  contributing_factor: { dash: "8 4", color: "var(--color-cat-economic)", label: "Contributing" },
  enabling_condition: { dash: "4 3", color: "var(--color-gold-500)", label: "Enabling" },
  consequence: { color: "var(--color-cat-cultural)", label: "Consequence" },
  feedback_loop: { dash: "6 2 2 2", color: "var(--color-cat-social)", label: "Feedback" },
  direct: { color: "var(--color-cat-political)", label: "Direct" },
  contributing: { dash: "8 4", color: "var(--color-cat-economic)", label: "Contributing" },
  enabling: { dash: "4 3", color: "var(--color-gold-500)", label: "Enabling" },
  preventing: { dash: "12 4 3 4", color: "var(--color-cat-military)", label: "Preventing" },
};

const defaultConfig = { dash: "6 3", color: "var(--color-slate-blue-300)", label: "" };

function CausalEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps) {
  const [hovered, setHovered] = useState(false);
  const edgeData = data as unknown as EdgeData;
  const config = typeConfig[edgeData?.type] || defaultConfig;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    curvature: 0.25,
  });

  const confidence = edgeData?.confidence ?? 0.5;
  const baseStroke = Math.max(1.5, confidence * 2.5);
  const strokeWidth = hovered || selected ? baseStroke + 1 : baseStroke;
  const opacity = hovered || selected ? 1 : Math.max(0.35, confidence * 0.7);

  const strokeColor = selected ? "var(--accent)" : config.color;
  const markerId = `arrow-${id}`;

  return (
    <>
      <defs>
        <marker
          id={markerId}
          markerWidth="10"
          markerHeight="10"
          refX="8"
          refY="5"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path
            d="M1.5,1.5 L8,5 L1.5,8.5"
            fill="none"
            stroke={strokeColor}
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={hovered || selected ? 1 : opacity}
          />
        </marker>
      </defs>

      {/* Invisible wide hit area for hover detection */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        className="cursor-pointer"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />

      {/* Glow on hover/select */}
      {(hovered || selected) && (
        <path
          d={edgePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth + 6}
          strokeOpacity={0.12}
          className="pointer-events-none"
        />
      )}

      {/* Main edge path */}
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={config.dash}
        strokeOpacity={opacity}
        strokeLinecap="round"
        markerEnd={`url(#${markerId})`}
        className="transition-all duration-150 pointer-events-none"
      />

      {/* Tooltip label — only on hover or select */}
      {edgeData?.label && (hovered || selected) && (
        <EdgeLabelRenderer>
          <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
              position: "absolute",
              transform: `translate(-50%, -100%) translate(${labelX}px,${labelY - 8}px)`,
              zIndex: 1000,
              pointerEvents: "all",
            }}
            className={cn(
              "px-2.5 py-1.5 rounded-lg text-[10px] font-medium whitespace-nowrap",
              "shadow-lg border animate-in fade-in-0 zoom-in-95 duration-150",
              selected
                ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                : "bg-[var(--bg-card)] text-[var(--text-primary)] border-[var(--border-color)]"
            )}
          >
            <div className="flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: config.color }}
              />
              <span>{edgeData.label}</span>
              <span className="text-[9px] opacity-50 ml-0.5">
                {Math.round(confidence * 100)}%
              </span>
            </div>
            {/* Tooltip arrow */}
            <div
              className={cn(
                "absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 rotate-45 border-r border-b",
                selected
                  ? "bg-[var(--accent)] border-[var(--accent)]"
                  : "bg-[var(--bg-card)] border-[var(--border-color)]"
              )}
            />
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const CausalEdge = memo(CausalEdgeComponent);
