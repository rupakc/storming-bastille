"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryContext } from "@/providers/QueryProvider";
import { ResultsLayout } from "@/components/results/ResultsLayout";

export default function QueryPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const {
    status,
    narrative,
    graph,
    timeline,
    sources,
    isStreaming,
    error,
    sessionId,
    queryId,
    followUps,
    startQuery,
  } = useQueryContext();

  const startedRef = useRef(false);

  // Start the query on mount if we have a query string
  useEffect(() => {
    if (query && !startedRef.current) {
      startedRef.current = true;
      startQuery(query);
    }
  }, [query, startQuery]);

  const handleFollowUp = (followUpQuery: string) => {
    startQuery(followUpQuery, sessionId || undefined, true);
  };

  return (
    <ResultsLayout
      status={status}
      narrative={narrative}
      graphNodes={graph?.nodes}
      graphEdges={graph?.edges}
      timeline={timeline}
      sources={sources}
      isStreaming={isStreaming}
      error={error}
      sessionId={sessionId}
      queryId={queryId}
      followUps={followUps}
      onFollowUp={handleFollowUp}
    />
  );
}
