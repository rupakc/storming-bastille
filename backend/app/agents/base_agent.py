import json
import logging
from collections.abc import AsyncGenerator

from app.core.anthropic_client import get_client

logger = logging.getLogger(__name__)


class BaseAgent:
    def __init__(
        self, system_prompt: str, model: str = "claude-sonnet-4-20250514", max_tokens: int = 8192
    ):
        self.system_prompt = system_prompt
        self.model = model
        self.max_tokens = max_tokens

    def _build_messages(
        self, user_message: str, conversation_history: list[dict] | None = None
    ) -> list[dict]:
        messages: list[dict] = []
        if conversation_history:
            messages.extend(conversation_history)
        messages.append({"role": "user", "content": user_message})
        return messages

    async def run(
        self,
        user_message: str,
        tools: list | None = None,
        conversation_history: list[dict] | None = None,
    ) -> str:
        client = get_client()
        messages = self._build_messages(user_message, conversation_history)

        kwargs: dict = {
            "model": self.model,
            "max_tokens": self.max_tokens,
            "system": self.system_prompt,
            "messages": messages,
        }
        if tools:
            kwargs["tools"] = tools

        while True:
            response = await client.messages.create(**kwargs)

            if response.stop_reason == "tool_use":
                assistant_content = response.content
                messages.append({"role": "assistant", "content": assistant_content})

                tool_results = []
                for block in assistant_content:
                    if block.type == "tool_use":
                        tool_result = await self._execute_tool(block.name, block.input)
                        tool_results.append(
                            {
                                "type": "tool_result",
                                "tool_use_id": block.id,
                                "content": json.dumps(tool_result)
                                if not isinstance(tool_result, str)
                                else tool_result,
                            }
                        )

                messages.append({"role": "user", "content": tool_results})
                kwargs["messages"] = messages
            else:
                text_parts = []
                for block in response.content:
                    if hasattr(block, "text"):
                        text_parts.append(block.text)
                return "\n".join(text_parts)

    async def stream(
        self,
        user_message: str,
        tools: list | None = None,
        conversation_history: list[dict] | None = None,
    ) -> AsyncGenerator[str, None]:
        client = get_client()
        messages = self._build_messages(user_message, conversation_history)

        kwargs: dict = {
            "model": self.model,
            "max_tokens": self.max_tokens,
            "system": self.system_prompt,
            "messages": messages,
        }
        if tools:
            kwargs["tools"] = tools

        while True:
            collected_content = []
            current_tool_uses = []
            stop_reason = None

            async with client.messages.stream(**kwargs) as stream:
                async for event in stream:
                    if event.type == "content_block_start":
                        if hasattr(event.content_block, "type"):
                            if event.content_block.type == "tool_use":
                                current_tool_uses.append(
                                    {
                                        "id": event.content_block.id,
                                        "name": event.content_block.name,
                                        "input_json": "",
                                    }
                                )
                    elif event.type == "content_block_delta":
                        if hasattr(event.delta, "text"):
                            yield event.delta.text
                        elif hasattr(event.delta, "partial_json"):
                            if current_tool_uses:
                                current_tool_uses[-1]["input_json"] += event.delta.partial_json

                final_message = await stream.get_final_message()
                stop_reason = final_message.stop_reason
                collected_content = final_message.content

            if stop_reason == "tool_use":
                messages.append({"role": "assistant", "content": collected_content})

                tool_results = []
                for block in collected_content:
                    if block.type == "tool_use":
                        tool_result = await self._execute_tool(block.name, block.input)
                        tool_results.append(
                            {
                                "type": "tool_result",
                                "tool_use_id": block.id,
                                "content": json.dumps(tool_result)
                                if not isinstance(tool_result, str)
                                else tool_result,
                            }
                        )

                messages.append({"role": "user", "content": tool_results})
                kwargs["messages"] = messages
            else:
                break

    async def _execute_tool(self, tool_name: str, tool_input: dict) -> str:
        logger.warning("Unhandled tool call: %s", tool_name)
        return f"Tool '{tool_name}' is not implemented in this agent."
