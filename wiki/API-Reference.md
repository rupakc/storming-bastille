# API Reference

The backend is a FastAPI app running on port 8000. All routes are prefixed as shown. Authentication uses JWT Bearer tokens — include `Authorization: Bearer <token>` in headers for protected routes.

---

## Authentication

### POST /auth/login

Returns a JWT token for the given credentials.

**Auth required:** No

**Request body:**
```json
{
  "username": "admin",
  "password": "changeme"
}
```

**Response:**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer"
}
```

The token expires after 24 hours by default. Include it in the `Authorization` header for all subsequent requests.

---

### GET /auth/me

Returns the currently authenticated user's profile.

**Auth required:** Yes

**Response:**
```json
{
  "id": "uuid",
  "username": "admin",
  "is_admin": true,
  "created_at": "2024-01-01T00:00:00Z"
}
```

---

### PATCH /auth/change-password

Updates the authenticated user's password.

**Auth required:** Yes

**Request body:**
```json
{
  "current_password": "changeme",
  "new_password": "new-secure-password"
}
```

**Response:**
```json
{"message": "Password updated successfully"}
```

---

## Queries

### POST /api/query

The main endpoint. Accepts a historical question and returns an SSE stream of analysis results.

**Auth required:** Yes

**Request body:**
```json
{
  "question": "What caused the French Revolution?",
  "session_id": "uuid"   // optional — omit to create a new session
}
```

**Response:** `Content-Type: text/event-stream`

The response is a Server-Sent Events stream. Each event has a `event:` type line and a `data:` JSON payload line.

#### SSE event schema

**`session` event** — emitted first, provides session context
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "query": "What caused the French Revolution?",
  "is_new_session": true
}
```

**`status` event** — phase progress updates
```json
{
  "message": "Searching the web...",
  "phase": 1
}
```
Phase values: 1 (search + narrative), 2 (graph nodes), 3 (causal analysis), 4 (source verification)

**`narrative` event** — streamed text chunks
```json
{
  "chunk": "The French Revolution, which began in 1789...",
  "done": false
}
```
Multiple chunks arrive. The final chunk has `"done": true`.

**`graph` event** — React Flow nodes and edges (emitted twice: nodes only, then nodes + edges)
```json
{
  "nodes": [
    {
      "id": "event_1",
      "type": "eventNode",
      "position": {"x": 100, "y": 200},
      "data": {
        "label": "Estates-General convened",
        "date": "1789-05-05",
        "description": "Louis XVI convenes the Estates-General...",
        "significance": "First meeting in 175 years, triggering political crisis",
        "type": "political"
      }
    }
  ],
  "edges": [
    {
      "id": "edge_1_2",
      "source": "event_1",
      "target": "event_2",
      "data": {
        "relationship_type": "direct_cause",
        "confidence": 0.88,
        "explanation": "The deadlock at Estates-General directly led to..."
      }
    }
  ],
  "timeline": [
    {
      "id": "event_1",
      "label": "Estates-General convened",
      "date": "1789-05-05",
      "date_numeric": 1789.34
    }
  ]
}
```
First emission: `edges` is an empty array. Second emission (after causal analysis): `edges` is populated.

**`sources` event** — citation data
```json
{
  "sources": [
    {
      "url": "https://en.wikipedia.org/wiki/French_Revolution",
      "title": "French Revolution - Wikipedia",
      "reliability_tier": "Encyclopedia",
      "relevance_score": 0.92,
      "supports_claims": ["The financial crisis of the French state..."]
    }
  ]
}
```

**`done` event** — stream complete
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## Sessions

### GET /api/sessions

Returns all sessions for the authenticated user.

**Auth required:** Yes

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "French Revolution Analysis",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:05:00Z",
    "query_count": 3
  }
]
```

---

### POST /api/sessions

Creates a new named session.

**Auth required:** Yes

**Request body:**
```json
{
  "name": "My Research Session"
}
```

**Response:** The created session object (same shape as list items above).

---

### GET /api/sessions/{session_id}

Returns full session detail including all queries and the saved graph.

**Auth required:** Yes

**Response:**
```json
{
  "id": "uuid",
  "name": "French Revolution Analysis",
  "queries": [
    {
      "id": "uuid",
      "question": "What caused the French Revolution?",
      "narrative": "The French Revolution...",
      "sources": [...],
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "graph": {
    "nodes": [...],
    "edges": [...]
  },
  "created_at": "...",
  "updated_at": "..."
}
```

---

### PATCH /api/sessions/{session_id}

Updates session metadata (currently just the name).

**Auth required:** Yes

**Request body:**
```json
{
  "name": "New Session Name"
}
```

---

### DELETE /api/sessions/{session_id}

Deletes the session and all associated queries and graph data.

**Auth required:** Yes

**Response:** `204 No Content`

---

### PATCH /api/sessions/{session_id}/graph

Saves an edited graph state back to the session. Called when the user manually repositions nodes or edits edges in the React Flow canvas.

**Auth required:** Yes

**Request body:**
```json
{
  "nodes": [...],
  "edges": [...]
}
```

**Response:** `200 OK` with the updated graph.

---

## Presets

### GET /api/presets

Returns the 12 curated starter questions from `backend/app/prompts/presets.json`, grouped by category.

**Auth required:** Yes

**Response:**
```json
{
  "categories": [
    {
      "name": "Revolutions",
      "presets": [
        {
          "id": "french-revolution",
          "question": "What caused the French Revolution?",
          "description": "Explore the social, economic, and political forces..."
        }
      ]
    }
  ]
}
```

Categories: Wars, Revolutions, Economic Crises, Scientific Breakthroughs, Political Collapses, Cultural Shifts.

---

## Health

### GET /api/health

Liveness check. Returns quickly without touching the database or external services.

**Auth required:** No

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0"
}
```

---

## Admin

All `/admin` routes require the authenticated user to have `is_admin: true`. Non-admin users receive `403 Forbidden`.

### GET /admin/users

Returns all users in the system.

**Auth required:** Yes (admin only)

**Response:** Array of user objects.

### POST /admin/users

Creates a new user account.

**Auth required:** Yes (admin only)

**Request body:**
```json
{
  "username": "newuser",
  "password": "secure-password",
  "is_admin": false
}
```
