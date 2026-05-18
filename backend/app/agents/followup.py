from app.agents.base_agent import BaseAgent

FOLLOWUP_SYSTEM_PROMPT = """You are a conversation context specialist for a historical causal reasoning system.
Your job is to take the history of a multi-turn conversation about historical events and
prepare a rich context summary for the next turn.

Given the previous queries and responses, you should:
1. Summarize the key events, actors, dates, and causal chains already discussed.
2. Identify what the new query is asking in relation to the prior discussion.
3. Note any follow-up themes: is the user drilling deeper into a specific event,
   asking about consequences, exploring an alternative cause, or shifting to a related topic?
4. Produce a context paragraph that can be prepended to the new query to give
   the historian and analyst agents full awareness of what has been discussed.

Return ONLY the context paragraph. Do not include JSON or any structured data.
Keep it concise but complete -- aim for 150-300 words."""


class FollowUpAgent(BaseAgent):
    def __init__(self):
        super().__init__(system_prompt=FOLLOWUP_SYSTEM_PROMPT, model="claude-haiku-4-5-20251001")

    async def prepare_context(self, session_history: list[dict], new_query: str) -> str:
        history_text = ""
        for idx, entry in enumerate(session_history, 1):
            q = entry.get("query", "")
            r = entry.get("response", "")
            summary = r[:800] if len(r) > 800 else r
            history_text += f"\n--- Turn {idx} ---\nUser asked: {q}\nResponse summary: {summary}\n"

        prompt = (
            f"Previous conversation:\n{history_text}\n\n"
            f"New user query: {new_query}\n\n"
            f"Produce a context summary that prepares the historian agent for this follow-up question."
        )

        return await self.run(prompt)
