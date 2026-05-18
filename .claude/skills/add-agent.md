---
name: add-agent
description: Scaffold a new specialist agent for the query pipeline
---

# Add a New Agent

When adding a new specialist agent to the pipeline:

1. Create `backend/app/agents/{name}.py`:
   - Inherit from `BaseAgent` in `agents/base_agent.py`
   - Write a focused system prompt that describes the agent's expertise
   - Implement the specialist method (e.g., `analyze()`, `research()`)
   - Use `self.run()` for single-response or `self.stream()` for streaming

2. Wire into `backend/app/agents/orchestrator.py`:
   - Import the new agent
   - Add it to the appropriate pipeline phase (parallel Phase 1 or sequential Phase 2)
   - Add SSE event emission for the agent's output

3. Create agent definition in `.agents/{name}.md` with YAML frontmatter

4. Add tests in `backend/tests/test_agents.py`

5. Update `CLAUDE.md` architecture diagram and project layout
