CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS queries (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    query_text TEXT NOT NULL,
    narrative TEXT DEFAULT '',
    sources TEXT DEFAULT '[]',
    created_at TEXT NOT NULL,
    sequence INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS graphs (
    id TEXT PRIMARY KEY,
    query_id TEXT NOT NULL REFERENCES queries(id) ON DELETE CASCADE,
    nodes TEXT DEFAULT '[]',
    edges TEXT DEFAULT '[]',
    timeline TEXT DEFAULT '[]',
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_queries_session ON queries(session_id);
CREATE INDEX IF NOT EXISTS idx_graphs_query ON graphs(query_id);
CREATE INDEX IF NOT EXISTS idx_queries_text ON queries(query_text);
