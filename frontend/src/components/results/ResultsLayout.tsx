"use client";

import { useState, useCallback } from "react";
import { motion } from "motion/react";
import {
  GripVertical,
  Clock,
  FileText,
  MessageCircle,
} from "lucide-react";
import { CausalGraph } from "@/components/graph/CausalGraph";
import { StreamingNarrative } from "./StreamingNarrative";
import { FollowUpInput } from "./FollowUpInput";
import { StatusIndicator, LoadingState } from "@/components/shared/LoadingState";
import { SaveDialog } from "@/components/sessions/SaveDialog";
import { cn, categoryColor, formatDate } from "@/lib/utils";
import type { FollowUpMessage } from "@/hooks/useStreamingQuery";
import ReactMarkdown from "react-markdown";
import type {
  StatusEvent,
  GraphNode,
  GraphEdge,
  TimelineEvent,
  Citation,
} from "@/lib/types";

type SidebarTab = "timeline" | "narrative" | "chat";

interface ResultsLayoutProps {
  status: StatusEvent | null;
  narrative: string;
  graphNodes?: GraphNode[];
  graphEdges?: GraphEdge[];
  timeline: TimelineEvent[];
  sources: Citation[];
  isStreaming: boolean;
  error: string | null;
  sessionId: string | null;
  queryId: string | null;
  followUps: FollowUpMessage[];
  onFollowUp: (query: string) => void;
}

export function ResultsLayout({
  status,
  narrative,
  graphNodes,
  graphEdges,
  timeline,
  isStreaming,
  error,
  sessionId,
  queryId,
  followUps,
  onFollowUp,
}: ResultsLayoutProps) {
  const [splitRatio, setSplitRatio] = useState(55);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<SidebarTab>("narrative");

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);

    const handleMouseMove = (e: MouseEvent) => {
      const container = document.getElementById("results-container");
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const ratio = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitRatio(Math.min(80, Math.max(30, ratio)));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, []);

  // Tab order: Timeline → Analysis → Chat
  const tabs: { id: SidebarTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: "timeline",
      label: "Timeline",
      icon: <Clock size={14} />,
      badge: timeline.length,
    },
    {
      id: "narrative",
      label: "Analysis",
      icon: <FileText size={14} />,
    },
    {
      id: "chat",
      label: "Chat",
      icon: <MessageCircle size={14} />,
      badge: followUps.length || undefined,
    },
  ];

  const isFollowUpStreaming = isStreaming && followUps.length > 0 && followUps[followUps.length - 1]?.isStreaming;

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Status bar */}
      {status && isStreaming && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 py-2 border-b border-[var(--border-subtle)]"
        >
          <StatusIndicator phase={status.phase} message={status.message} />
        </motion.div>
      )}

      {/* Error */}
      {error && (
        <div className="px-4 py-3 bg-red-500/10 border-b border-red-500/20 text-sm text-red-500">
          {error}
        </div>
      )}

      {/* Main split layout */}
      <div
        id="results-container"
        className="flex-1 flex flex-col lg:flex-row overflow-hidden"
      >
        {/* Left panel: Causal Graph */}
        <div
          className="flex flex-col overflow-hidden border-b lg:border-b-0 lg:border-r border-[var(--border-subtle)]"
          style={{ flex: `0 0 ${splitRatio}%` }}
        >
          <div className="flex-1 min-h-0">
            <CausalGraph
              graphNodes={graphNodes}
              graphEdges={graphEdges}
              isLoading={isStreaming && !graphNodes}
            />
          </div>
        </div>

        {/* Drag handle (desktop) */}
        <div
          onMouseDown={handleMouseDown}
          className={cn(
            "hidden lg:flex items-center justify-center w-2 cursor-col-resize hover:bg-[var(--accent)]/10 transition-colors",
            isDragging && "bg-[var(--accent)]/20"
          )}
        >
          <GripVertical size={12} className="text-[var(--text-muted)]" />
        </div>

        {/* Right panel: Tabbed sidebar */}
        <div className="flex-1 min-w-0 flex flex-col bg-[var(--bg-card)] overflow-hidden">
          {/* Tab bar */}
          <div className="shrink-0 flex border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/50">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-all relative",
                  activeTab === tab.id
                    ? "text-[var(--accent)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                )}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    className={cn(
                      "ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-semibold",
                      activeTab === tab.id
                        ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                        : "bg-[var(--bg-secondary)] text-[var(--text-muted)]"
                    )}
                  >
                    {tab.badge}
                  </span>
                )}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute bottom-0 left-2 right-2 h-0.5 bg-[var(--accent)] rounded-full"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            {/* Timeline tab */}
            {activeTab === "timeline" && (
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {isStreaming && timeline.length === 0 ? (
                  <LoadingState variant="results" />
                ) : timeline.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-sm text-[var(--text-muted)] italic">
                    Timeline events will appear once analysis completes.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {timeline.map((event, i) => {
                      const colors = categoryColor(event.category);
                      return (
                        <div
                          key={event.id || i}
                          className="flex gap-2.5 items-start group"
                        >
                          <div className="flex flex-col items-center mt-1.5">
                            <div
                              className={cn(
                                "w-2.5 h-2.5 rounded-full ring-2 ring-[var(--bg-card)] shrink-0",
                                colors.dot
                              )}
                            />
                            {i < timeline.length - 1 && (
                              <div className="w-px flex-1 min-h-[16px] bg-[var(--border-subtle)]" />
                            )}
                          </div>
                          <div className="flex-1 pb-3">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span
                                className={cn(
                                  "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0",
                                  colors.bg,
                                  colors.text
                                )}
                              >
                                {formatDate(event.date)}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-[var(--text-primary)] leading-snug">
                              {event.title}
                            </p>
                            {event.description && (
                              <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                                {event.description}
                              </p>
                            )}
                            {event.rationale && (
                              <p className="text-[11px] text-[var(--text-muted)] mt-1.5 leading-relaxed italic border-l-2 border-[var(--accent)]/30 pl-2">
                                {event.rationale}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Analysis tab */}
            {activeTab === "narrative" && (
              <div className="flex-1 overflow-hidden flex flex-col">
                {isStreaming && !narrative && !isFollowUpStreaming ? (
                  <LoadingState variant="results" />
                ) : (
                  <StreamingNarrative
                    content={narrative}
                    isStreaming={isStreaming && !isFollowUpStreaming}
                  />
                )}
              </div>
            )}

            {/* Chat (follow-up) tab */}
            {activeTab === "chat" && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                  {followUps.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <MessageCircle size={32} className="mx-auto mb-3 text-[var(--text-muted)] opacity-40" />
                        <p className="text-sm text-[var(--text-muted)] italic">
                          Ask follow-up questions about the analysis.
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-1 opacity-60">
                          The original analysis and graph will be preserved.
                        </p>
                      </div>
                    </div>
                  ) : (
                    followUps.map((msg, i) => (
                      <div key={i} className="space-y-3">
                        <div className="flex justify-end">
                          <div className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-br-md bg-[var(--accent)]/10 border border-[var(--accent)]/20">
                            <p className="text-sm text-[var(--text-primary)]">
                              {msg.question}
                            </p>
                          </div>
                        </div>
                        <div className="flex justify-start">
                          <div className="max-w-[92%] px-4 py-3 rounded-2xl rounded-bl-md bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                            {msg.answer ? (
                              <div
                                className={cn(
                                  "narrative-prose text-sm text-[var(--text-primary)] leading-relaxed",
                                  msg.isStreaming && "streaming-cursor"
                                )}
                              >
                                <ReactMarkdown>{msg.answer}</ReactMarkdown>
                              </div>
                            ) : msg.isStreaming ? (
                              <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                                <div className="flex gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: "0ms" }} />
                                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: "150ms" }} />
                                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: "300ms" }} />
                                </div>
                                Thinking...
                              </div>
                            ) : (
                              <p className="text-sm text-[var(--text-muted)] italic">No response.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="shrink-0">
                  <FollowUpInput
                    onSubmit={onFollowUp}
                    isLoading={isStreaming}
                    disabled={!sessionId && !isStreaming}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Save button */}
          {queryId && !isStreaming && (
            <div className="shrink-0 px-5 pb-3 border-t border-[var(--border-subtle)]">
              <div className="pt-2">
                <SaveDialog queryId={queryId} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
