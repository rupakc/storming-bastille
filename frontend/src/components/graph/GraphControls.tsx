"use client";

import { useReactFlow } from "@xyflow/react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Download,
  ArrowRightLeft,
  ArrowUpDown,
} from "lucide-react";
import { useState, useCallback } from "react";
import type { LayoutDirection } from "@/lib/graph-layout";

interface GraphControlsProps {
  direction: LayoutDirection;
  onLayoutChange: (dir: LayoutDirection) => void;
}

export function GraphControls({
  direction,
  onLayoutChange,
}: GraphControlsProps) {
  const { zoomIn, zoomOut, fitView, getNodes } = useReactFlow();
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    const el = document.querySelector("[data-graph-container]");
    if (!el) return;

    if (!document.fullscreenElement) {
      el.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  const exportPng = useCallback(async () => {
    const el = document.querySelector("[data-graph-container]") as HTMLElement;
    if (!el) return;

    const viewport = el.querySelector(".react-flow__viewport") as HTMLElement;
    if (!viewport) return;

    try {
      const { toPng } = await import("html-to-image");

      // Calculate the bounding box of ALL nodes to capture the full graph
      const nodes = getNodes();
      const padding = 50;

      if (nodes.length === 0) return;

      // Find the full extent of all nodes
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const node of nodes) {
        const w = node.measured?.width ?? 200;
        const h = node.measured?.height ?? 80;
        minX = Math.min(minX, node.position.x);
        minY = Math.min(minY, node.position.y);
        maxX = Math.max(maxX, node.position.x + w);
        maxY = Math.max(maxY, node.position.y + h);
      }

      const graphWidth = maxX - minX + padding * 2;
      const graphHeight = maxY - minY + padding * 2;

      // Save current viewport transform, then override to show full graph at 1:1
      const prevTransform = viewport.style.transform;
      viewport.style.transform = `translate(${-minX + padding}px, ${-minY + padding}px) scale(1)`;

      const bgColor =
        getComputedStyle(document.documentElement)
          .getPropertyValue("--bg-secondary")
          .trim() || "#1a1a2e";

      const dataUrl = await toPng(viewport, {
        backgroundColor: bgColor,
        width: graphWidth,
        height: graphHeight,
        pixelRatio: 2,
        filter: (node: HTMLElement) => {
          if (node.classList?.contains("react-flow__minimap")) return false;
          if (node.classList?.contains("react-flow__controls")) return false;
          return true;
        },
      });

      // Restore viewport transform
      viewport.style.transform = prevTransform;

      const link = document.createElement("a");
      link.download = "causal-graph.png";
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("PNG export failed:", err);
    }
  }, [getNodes]);

  const btnClass =
    "p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors shadow-sm";

  return (
    <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
      <button onClick={() => zoomIn()} className={btnClass} title="Zoom in">
        <ZoomIn size={16} />
      </button>
      <button onClick={() => zoomOut()} className={btnClass} title="Zoom out">
        <ZoomOut size={16} />
      </button>
      <button
        onClick={() => fitView({ padding: 0.2, duration: 400 })}
        className={btnClass}
        title="Fit view"
      >
        <Maximize2 size={16} />
      </button>

      <div className="w-full h-px bg-[var(--border-subtle)] my-0.5" />

      <button
        onClick={() =>
          onLayoutChange(direction === "LR" ? "TB" : "LR")
        }
        className={btnClass}
        title={
          direction === "LR" ? "Switch to vertical" : "Switch to horizontal"
        }
      >
        {direction === "LR" ? (
          <ArrowUpDown size={16} />
        ) : (
          <ArrowRightLeft size={16} />
        )}
      </button>
      <button onClick={exportPng} className={btnClass} title="Export as PNG">
        <Download size={16} />
      </button>
      <button
        onClick={toggleFullscreen}
        className={btnClass}
        title="Toggle fullscreen"
      >
        {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
      </button>
    </div>
  );
}
