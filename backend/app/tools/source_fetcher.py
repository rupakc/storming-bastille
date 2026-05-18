import asyncio
import logging
import re

import httpx
from bs4 import BeautifulSoup
from duckduckgo_search import DDGS

logger = logging.getLogger(__name__)


async def fetch_content(url: str) -> str | None:
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            resp = await client.get(
                url,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                },
            )
            resp.raise_for_status()
            content_type = resp.headers.get("content-type", "")
            if "text/html" not in content_type:
                return None

            soup = BeautifulSoup(resp.text, "html.parser")

            for tag in soup(["script", "style", "nav", "header", "footer", "aside"]):
                tag.decompose()

            text = soup.get_text(separator="\n", strip=True)
            text = re.sub(r"\n{3,}", "\n\n", text)
            return text[:5000]
    except Exception as exc:
        logger.warning("Failed to fetch content from %s: %s", url, exc)
        return None


async def fetch_image_url(query: str) -> str | None:
    try:
        loop = asyncio.get_event_loop()
        results = await loop.run_in_executor(
            None,
            lambda: DDGS().images(f"{query} historical", max_results=3),
        )
        if results:
            return results[0].get("image", results[0].get("thumbnail", None))
    except Exception as exc:
        logger.warning("Image search failed for '%s': %s", query, exc)
    return None
