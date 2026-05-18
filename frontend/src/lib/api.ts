import type {
  PresetPrompt,
  SessionSummary,
  Session,
  GraphNode,
  GraphEdge,
  TimelineEvent,
} from "./types";

const BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${body || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchPresets(): Promise<PresetPrompt[]> {
  return request<PresetPrompt[]>("/presets");
}

export async function fetchSessions(): Promise<SessionSummary[]> {
  return request<SessionSummary[]>("/sessions");
}

export async function fetchSession(id: string): Promise<Session> {
  return request<Session>(`/sessions/${id}`);
}

export async function saveSession(
  title: string,
  queryId: string
): Promise<Session> {
  return request<Session>("/sessions", {
    method: "POST",
    body: JSON.stringify({ title, query_id: queryId }),
  });
}

export async function deleteSession(id: string): Promise<void> {
  await fetch(`${BASE}/sessions/${id}`, { method: "DELETE" });
}

export async function saveGraph(
  sessionId: string,
  nodes: GraphNode[],
  edges: GraphEdge[],
  timeline?: TimelineEvent[]
): Promise<void> {
  await request(`/sessions/${sessionId}/graph`, {
    method: "PATCH",
    body: JSON.stringify({ nodes, edges, timeline }),
  });
}
