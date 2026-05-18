"use client";

import { useState, useEffect, useCallback } from "react";
import type { SessionSummary } from "@/lib/types";
import * as api from "@/lib/api";

export function useSessions() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.fetchSessions();
      setSessions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const saveCurrentSession = useCallback(
    async (title: string, queryId: string) => {
      try {
        const session = await api.saveSession(title, queryId);
        setSessions((prev) => [
          {
            id: session.id,
            title: session.title,
            query_count: session.queries.length,
            created_at: session.created_at,
            updated_at: session.updated_at,
          },
          ...prev,
        ]);
        return session;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save session");
        return null;
      }
    },
    []
  );

  const removeSession = useCallback(async (id: string) => {
    try {
      await api.deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete session"
      );
    }
  }, []);

  return {
    sessions,
    loading,
    error,
    loadSessions,
    saveCurrentSession,
    deleteSession: removeSession,
  };
}
