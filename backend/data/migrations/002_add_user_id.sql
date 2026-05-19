-- Add user_id to sessions table for per-user filtering.
-- Existing sessions (pre-auth) are left with user_id = NULL so they remain accessible.
ALTER TABLE sessions ADD COLUMN user_id TEXT;
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
