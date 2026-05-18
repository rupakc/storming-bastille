import type {
  QueryRequest,
  SessionEvent,
  StatusEvent,
  NarrativeEvent,
  GraphEvent,
  TimelineEventPayload,
  SourcesEvent,
  DoneEvent,
} from "./types";

export interface StreamCallbacks {
  onSession?: (data: SessionEvent) => void;
  onStatus?: (data: StatusEvent) => void;
  onNarrative?: (data: NarrativeEvent) => void;
  onGraph?: (data: GraphEvent) => void;
  onTimeline?: (data: TimelineEventPayload) => void;
  onSources?: (data: SourcesEvent) => void;
  onDone?: (data: DoneEvent) => void;
  onError?: (error: Error) => void;
}

/**
 * Stream a query to the backend using POST + SSE.
 * Returns an AbortController so the caller can cancel the stream.
 */
export function streamQuery(
  request: QueryRequest,
  callbacks: StreamCallbacks
): AbortController {
  const controller = new AbortController();

  (async () => {
    try {
      // Call backend directly to avoid Next.js proxy buffering SSE chunks
      const baseUrl = typeof window !== "undefined"
        ? `${window.location.protocol}//${window.location.hostname}:8000`
        : "http://localhost:8000";

      const res = await fetch(`${baseUrl}/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Query failed (${res.status}): ${text || res.statusText}`);
      }

      if (!res.body) {
        throw new Error("No response body — streaming not supported");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let currentEvent = "";
      let currentData = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages from buffer
        // Split on \n and strip \r to handle both LF and CRLF line endings
        const lines = buffer.split("\n");
        // Keep the last potentially incomplete line in the buffer
        buffer = lines.pop() || "";

        for (const rawLine of lines) {
          const line = rawLine.replace(/\r$/, "");

          if (line.startsWith("event:")) {
            currentEvent = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            currentData += line.slice(5).trim();
          } else if (line === "" && currentEvent && currentData) {
            // End of an SSE message — blank line is the delimiter
            try {
              const parsed = JSON.parse(currentData);
              dispatchEvent(currentEvent, parsed, callbacks);
            } catch {
              console.warn("Failed to parse SSE data:", currentData);
            }
            currentEvent = "";
            currentData = "";
          }
        }
      }

      // Process any remaining complete message in the buffer
      if (buffer.trim()) {
        const remaining = buffer.split("\n");
        for (const rawLine of remaining) {
          const line = rawLine.replace(/\r$/, "");
          if (line.startsWith("event:")) {
            currentEvent = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            currentData += line.slice(5).trim();
          }
        }
        if (currentEvent && currentData) {
          try {
            const parsed = JSON.parse(currentData);
            dispatchEvent(currentEvent, parsed, callbacks);
          } catch {
            // ignore trailing incomplete data
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return; // User cancelled — not an error
      }
      callbacks.onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  })();

  return controller;
}

function dispatchEvent(
  event: string,
  data: unknown,
  callbacks: StreamCallbacks
) {
  switch (event) {
    case "session":
      callbacks.onSession?.(data as SessionEvent);
      break;
    case "status":
      callbacks.onStatus?.(data as StatusEvent);
      break;
    case "narrative":
      callbacks.onNarrative?.(data as NarrativeEvent);
      break;
    case "graph":
      callbacks.onGraph?.(data as GraphEvent);
      break;
    case "timeline":
      callbacks.onTimeline?.(data as TimelineEventPayload);
      break;
    case "sources":
      callbacks.onSources?.(data as SourcesEvent);
      break;
    case "done":
      callbacks.onDone?.(data as DoneEvent);
      break;
    case "error":
      callbacks.onError?.(new Error((data as Record<string, string>).message || "Unknown server error"));
      break;
    default:
      console.warn("Unknown SSE event:", event);
  }
}
