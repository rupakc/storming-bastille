"use client";

import { useState, useCallback, useRef } from "react";
import { streamQuery } from "@/lib/sse";
import type {
  QueryRequest,
  StatusEvent,
  CausalGraphResponse,
  TimelineEvent,
  Citation,
} from "@/lib/types";

export interface FollowUpMessage {
  question: string;
  answer: string;
  isStreaming: boolean;
}

export interface StreamingQueryState {
  status: StatusEvent | null;
  narrative: string;
  graph: CausalGraphResponse | null;
  timeline: TimelineEvent[];
  sources: Citation[];
  isStreaming: boolean;
  error: string | null;
  sessionId: string | null;
  queryId: string | null;
  followUps: FollowUpMessage[];
}

const initialState: StreamingQueryState = {
  status: null,
  narrative: "",
  graph: null,
  timeline: [],
  sources: [],
  isStreaming: false,
  error: null,
  sessionId: null,
  queryId: null,
  followUps: [],
};

export function useStreamingQuery() {
  const [state, setState] = useState<StreamingQueryState>(initialState);
  const controllerRef = useRef<AbortController | null>(null);
  const isFollowUpRef = useRef(false);

  const startQuery = useCallback(
    (query: string, sessionId?: string, followUp?: boolean) => {
      // Cancel any existing stream
      controllerRef.current?.abort();
      isFollowUpRef.current = !!followUp;

      if (followUp) {
        // Add a new follow-up message entry; keep everything else intact
        setState((prev) => ({
          ...prev,
          isStreaming: true,
          error: null,
          status: null,
          followUps: [
            ...prev.followUps,
            { question: query, answer: "", isStreaming: true },
          ],
        }));
      } else {
        // Fresh query — reset everything
        setState({ ...initialState, isStreaming: true });
      }

      const request: QueryRequest = {
        query,
        session_id: sessionId,
        follow_up: followUp,
      };

      const controller = streamQuery(request, {
        onSession(data) {
          setState((prev) => ({
            ...prev,
            sessionId: data.session_id,
            queryId: data.query_id,
          }));
        },
        onStatus(data) {
          setState((prev) => ({ ...prev, status: data }));
        },
        onNarrative(data) {
          if (isFollowUpRef.current) {
            // Append to the last follow-up message's answer
            setState((prev) => {
              const fups = [...prev.followUps];
              const last = fups[fups.length - 1];
              if (last) {
                fups[fups.length - 1] = {
                  ...last,
                  answer: last.answer + data.chunk,
                };
              }
              return { ...prev, followUps: fups };
            });
          } else {
            setState((prev) => ({
              ...prev,
              narrative: prev.narrative + data.chunk,
            }));
          }
        },
        onGraph(data) {
          setState((prev) => ({
            ...prev,
            graph: data,
          }));
        },
        onTimeline(data) {
          setState((prev) => ({
            ...prev,
            timeline: data.events,
          }));
        },
        onSources(data) {
          setState((prev) => ({
            ...prev,
            sources: data.citations,
          }));
        },
        onDone(data) {
          if (isFollowUpRef.current) {
            setState((prev) => {
              const fups = [...prev.followUps];
              const last = fups[fups.length - 1];
              if (last) {
                fups[fups.length - 1] = { ...last, isStreaming: false };
              }
              return {
                ...prev,
                isStreaming: false,
                followUps: fups,
                sessionId: data.session_id,
                queryId: data.query_id,
              };
            });
          } else {
            setState((prev) => ({
              ...prev,
              isStreaming: false,
              sessionId: data.session_id,
              queryId: data.query_id,
            }));
          }
        },
        onError(error) {
          setState((prev) => ({
            ...prev,
            isStreaming: false,
            error: error.message,
          }));
        },
      });

      controllerRef.current = controller;
    },
    []
  );

  const cancelQuery = useCallback(() => {
    controllerRef.current?.abort();
    setState((prev) => ({ ...prev, isStreaming: false }));
  }, []);

  return {
    ...state,
    startQuery,
    cancelQuery,
  };
}
