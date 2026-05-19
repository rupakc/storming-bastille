import type {
  PresetPrompt,
  SessionSummary,
  Session,
  GraphNode,
  GraphEdge,
  TimelineEvent,
} from "./types";

const BASE = "/api";
const TOKEN_KEY = "sb_token";

/** Returns auth headers if a token is stored, or an empty object. */
export function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...(init?.headers as Record<string, string> | undefined),
    },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${body || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchPresets(): Promise<PresetPrompt[]> {
  // Backend returns { presets: [...] }
  const res = await request<{ presets: PresetPrompt[] }>("/presets");
  return res.presets ?? [];
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
  await fetch(`${BASE}/sessions/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
}

export async function saveGraph(
  sessionId: string,
  nodes: GraphNode[],
  edges: GraphEdge[],
  timeline?: TimelineEvent[],
  queryId?: string
): Promise<void> {
  await request(`/sessions/${sessionId}/graph`, {
    method: "PATCH",
    body: JSON.stringify({ nodes, edges, timeline: timeline ?? [], query_id: queryId }),
  });
}
