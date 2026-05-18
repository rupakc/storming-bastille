#!/usr/bin/env python3
"""Re-run all preset prompts against the query API to refresh cached results."""

import json
import sys
import time
import httpx

API_URL = "http://localhost:8000/api/query"
PRESETS_PATH = "backend/app/prompts/presets.json"


def run_query(query: str, timeout: float = 120.0) -> dict:
    """Send a query to the SSE endpoint and consume the full stream."""
    result = {"session_id": None, "events_count": 0, "has_graph": False, "error": None}

    with httpx.Client(timeout=timeout) as client:
        with client.stream(
            "POST",
            API_URL,
            json={"query": query},
            headers={"Accept": "text/event-stream"},
        ) as response:
            if response.status_code != 200:
                result["error"] = f"HTTP {response.status_code}"
                return result

            for line in response.iter_lines():
                if not line.startswith("data:"):
                    continue
                try:
                    payload = json.loads(line[5:].strip())
                except json.JSONDecodeError:
                    continue

                if isinstance(payload, dict):
                    if "session_id" in payload:
                        result["session_id"] = payload["session_id"]
                    if "nodes" in payload and payload["nodes"]:
                        result["has_graph"] = True
                        result["events_count"] = len(payload["nodes"])

    return result


def main():
    with open(PRESETS_PATH) as f:
        presets = json.load(f)

    print(f"\nRefreshing {len(presets)} preset prompts...\n")
    print(f"{'#':<4} {'Status':<8} {'Events':<8} {'Time':>7}  Query")
    print("-" * 90)

    success = 0
    for idx, preset in enumerate(presets, 1):
        query = preset["text"]
        short = query[:60] + ("..." if len(query) > 60 else "")

        start = time.time()
        try:
            result = run_query(query)
            elapsed = time.time() - start

            if result["error"]:
                status = "FAIL"
                print(f"{idx:<4} {status:<8} {'—':<8} {elapsed:>6.1f}s  {short}")
                print(f"     Error: {result['error']}")
            else:
                status = "OK"
                events = result["events_count"]
                success += 1
                print(f"{idx:<4} {status:<8} {events:<8} {elapsed:>6.1f}s  {short}")

        except Exception as exc:
            elapsed = time.time() - start
            print(f"{idx:<4} {'ERROR':<8} {'—':<8} {elapsed:>6.1f}s  {short}")
            print(f"     {exc}")

    print("-" * 90)
    print(f"\nDone: {success}/{len(presets)} presets refreshed successfully.\n")
    return 0 if success == len(presets) else 1


if __name__ == "__main__":
    sys.exit(main())
