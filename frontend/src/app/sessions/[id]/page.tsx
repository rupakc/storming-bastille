"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "motion/react";
import { ArrowLeft, Clock } from "lucide-react";
import Link from "next/link";
import { fetchSession } from "@/lib/api";
import { CausalGraph } from "@/components/graph/CausalGraph";
import { Timeline } from "@/components/timeline/Timeline";
import { StreamingNarrative } from "@/components/results/StreamingNarrative";
import { SourceCitations } from "@/components/results/SourceCitations";
import { LoadingState } from "@/components/shared/LoadingState";
import { formatDate } from "@/lib/utils";
import type { Session } from "@/lib/types";

export default function SessionDetailPage() {
  const params = useParams<{ id: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeQueryIdx, setActiveQueryIdx] = useState(0);

  useEffect(() => {
    if (!params.id) return;
    setLoading(true);
    fetchSession(params.id)
      .then(setSession)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load session")
      )
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <LoadingState variant="results" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="text-center py-20">
          <p className="text-lg text-red-500">{error || "Session not found"}</p>
          <Link
            href="/sessions"
            className="inline-flex items-center gap-1 mt-4 text-sm text-[var(--accent)] hover:underline"
          >
            <ArrowLeft size={14} />
            Back to sessions
          </Link>
        </div>
      </div>
    );
  }

  const activeQuery = session.queries[activeQueryIdx];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <Link
          href="/sessions"
          className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors mb-3"
        >
          <ArrowLeft size={14} />
          Back to sessions
        </Link>

        <h1 className="text-2xl font-bold text-[var(--text-primary)] font-[family-name:var(--font-display)]">
          {session.title}
        </h1>

        <div className="flex items-center gap-2 mt-1 text-sm text-[var(--text-muted)]">
          <Clock size={14} />
          {formatDate(session.created_at)}
          <span className="mx-1">&middot;</span>
          {session.queries.length}{" "}
          {session.queries.length === 1 ? "query" : "queries"}
        </div>
      </motion.div>

      {/* Query tabs */}
      {session.queries.length > 1 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {session.queries.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setActiveQueryIdx(i)}
              className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                i === activeQueryIdx
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
              }`}
            >
              {q.query.length > 40 ? q.query.slice(0, 40) + "..." : q.query}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {activeQuery && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Graph + Timeline */}
          <div className="lg:col-span-3 space-y-4">
            <div className="h-[450px] rounded-xl border border-[var(--border-subtle)] overflow-hidden bg-[var(--bg-secondary)]">
              <CausalGraph
                graphNodes={activeQuery.graph?.nodes}
                graphEdges={activeQuery.graph?.edges}
              />
            </div>
            {activeQuery.timeline && activeQuery.timeline.length > 0 && (
              <div className="h-[140px] rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-2">
                <Timeline events={activeQuery.timeline} />
              </div>
            )}
          </div>

          {/* Narrative + Sources */}
          <div className="lg:col-span-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] overflow-hidden flex flex-col max-h-[650px]">
            <StreamingNarrative
              content={activeQuery.narrative}
              isStreaming={false}
            />
            <SourceCitations citations={activeQuery.sources || []} />
          </div>
        </div>
      )}
    </div>
  );
}
