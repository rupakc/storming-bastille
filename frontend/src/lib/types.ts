// ---- Core data types ----

export interface Position {
  x: number;
  y: number;
}

export interface EventData {
  [key: string]: unknown;
  title: string;
  date: string;
  description: string;
  category: "political" | "economic" | "social" | "military" | "cultural";
  source_urls?: string[];
  image_url?: string;
  is_primary?: boolean;
}

export interface EdgeData {
  [key: string]: unknown;
  label: string;
  type: "direct" | "contributing" | "enabling" | "preventing" | "consequence";
  confidence: number;
  explanation?: string;
}

export interface GraphNode {
  id: string;
  type: string;
  data: EventData;
  position: Position;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  data: EdgeData;
}

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  category: string;
  description: string;
  rationale?: string;
}

export interface Citation {
  url: string;
  title: string;
  snippet?: string;
  relevance_score?: number;
}

// ---- SSE streaming types ----

export interface StatusEvent {
  phase: string;
  message: string;
}

export interface NarrativeEvent {
  chunk: string;
}

export interface GraphEvent {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface TimelineEventPayload {
  events: TimelineEvent[];
}

export interface SourcesEvent {
  citations: Citation[];
}

export interface SessionEvent {
  session_id: string;
  query_id: string;
}

export interface DoneEvent {
  session_id: string;
  query_id: string;
}

export type StreamEvent =
  | { type: "status"; data: StatusEvent }
  | { type: "narrative"; data: NarrativeEvent }
  | { type: "graph"; data: GraphEvent }
  | { type: "timeline"; data: TimelineEventPayload }
  | { type: "sources"; data: SourcesEvent }
  | { type: "done"; data: DoneEvent };

// ---- API request/response types ----

export interface QueryRequest {
  query: string;
  session_id?: string;
  follow_up?: boolean;
}

export interface CausalGraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface PresetPrompt {
  id: string;
  text: string;
  category: string;
  icon?: string;
}

// ---- Session types ----

export interface QueryRecord {
  id: string;
  query: string;
  narrative: string;
  graph: CausalGraphResponse;
  timeline: TimelineEvent[];
  sources: Citation[];
  created_at: string;
}

export interface Session {
  id: string;
  title: string;
  queries: QueryRecord[];
  created_at: string;
  updated_at: string;
}

export interface SessionSummary {
  id: string;
  title: string;
  query_count: number;
  created_at: string;
  updated_at: string;
}

// ---- UI state types ----

export interface SearchState {
  query: string;
  isStreaming: boolean;
  status: StatusEvent | null;
  narrative: string;
  graph: CausalGraphResponse | null;
  timeline: TimelineEvent[];
  sources: Citation[];
  error: string | null;
  sessionId: string | null;
  queryId: string | null;
}
