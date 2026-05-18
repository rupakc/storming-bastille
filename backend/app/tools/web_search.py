import asyncio
import logging
from dataclasses import dataclass

import httpx
from bs4 import BeautifulSoup

from app.core.cache import cache_get, cache_set

logger = logging.getLogger(__name__)


@dataclass
class SearchResult:
    title: str
    url: str
    snippet: str


async def search_ddg_html(query: str, num_results: int = 10) -> list[SearchResult]:
    """Search DuckDuckGo via HTML interface (no external library needed)."""
    cache_key_str = f"ddg:{query}:{num_results}"
    cached = cache_get(cache_key_str)
    if cached is not None:
        return cached

    enriched_query = f"{query} history historical"
    results: list[SearchResult] = []

    try:
        async with httpx.AsyncClient(timeout=5.0, follow_redirects=True) as client:
            resp = await client.get(
                "https://html.duckduckgo.com/html/",
                params={"q": enriched_query},
                headers={
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
                },
            )
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")
            for result_div in soup.select(".result__body")[:num_results]:
                title_el = result_div.select_one(".result__title a")
                snippet_el = result_div.select_one(".result__snippet")
                if title_el:
                    title = title_el.get_text(strip=True)
                    url = title_el.get("href", "")
                    snippet = snippet_el.get_text(strip=True) if snippet_el else ""
                    if title and url:
                        results.append(SearchResult(title=title, url=str(url), snippet=snippet))
    except Exception as exc:
        logger.warning("DuckDuckGo HTML search failed: %s", exc)

    if results:
        cache_set(cache_key_str, results)
    return results


async def search_bing(query: str, num_results: int = 10) -> list[SearchResult]:
    """Search via Bing HTML scraping as secondary source."""
    cache_key_str = f"bing:{query}:{num_results}"
    cached = cache_get(cache_key_str)
    if cached is not None:
        return cached

    enriched_query = f"{query} history historical"
    results: list[SearchResult] = []

    try:
        async with httpx.AsyncClient(timeout=5.0, follow_redirects=True) as client:
            resp = await client.get(
                "https://www.bing.com/search",
                params={"q": enriched_query},
                headers={
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
                },
            )
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")
            for li in soup.select("li.b_algo")[:num_results]:
                title_el = li.select_one("h2 a")
                snippet_el = li.select_one(".b_caption p")
                if title_el:
                    title = title_el.get_text(strip=True)
                    url = title_el.get("href", "")
                    snippet = snippet_el.get_text(strip=True) if snippet_el else ""
                    if title and url:
                        results.append(SearchResult(title=title, url=str(url), snippet=snippet))
    except Exception as exc:
        logger.warning("Bing search failed: %s", exc)

    if results:
        cache_set(cache_key_str, results)
    return results


async def deep_search(query: str) -> list[SearchResult]:
    """Run DuckDuckGo + Bing in parallel with strict timeout."""
    try:
        ddg_results, bing_results = await asyncio.wait_for(
            asyncio.gather(
                search_ddg_html(query),
                search_bing(query),
                return_exceptions=True,
            ),
            timeout=4.0,
        )
    except asyncio.TimeoutError:
        logger.warning("Deep search timed out after 6s")
        return []

    if isinstance(ddg_results, BaseException):
        ddg_results = []
    if isinstance(bing_results, BaseException):
        bing_results = []

    seen_urls: set[str] = set()
    merged: list[SearchResult] = []

    for r in ddg_results:
        if r.url not in seen_urls:
            seen_urls.add(r.url)
            merged.append(r)

    for r in bing_results:
        if r.url not in seen_urls:
            seen_urls.add(r.url)
            merged.append(r)

    return merged
