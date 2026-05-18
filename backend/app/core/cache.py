import hashlib
from cachetools import TTLCache

_search_cache: TTLCache = TTLCache(maxsize=512, ttl=1800)  # 30 minutes


def cache_key(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def cache_get(key: str):
    return _search_cache.get(cache_key(key))


def cache_set(key: str, value):
    _search_cache[cache_key(key)] = value


def cache_clear():
    _search_cache.clear()
