"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
  useStreamingQuery,
  type StreamingQueryState,
} from "@/hooks/useStreamingQuery";

interface QueryContextValue extends StreamingQueryState {
  startQuery: (query: string, sessionId?: string, followUp?: boolean) => void;
  cancelQuery: () => void;
}

const QueryContext = createContext<QueryContextValue | null>(null);

export function QueryProvider({ children }: { children: ReactNode }) {
  const query = useStreamingQuery();

  return (
    <QueryContext.Provider value={query}>{children}</QueryContext.Provider>
  );
}

export function useQueryContext(): QueryContextValue {
  const ctx = useContext(QueryContext);
  if (!ctx) {
    throw new Error("useQueryContext must be used within QueryProvider");
  }
  return ctx;
}
