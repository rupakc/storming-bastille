import json
import logging
from pathlib import Path

from fastapi import APIRouter

logger = logging.getLogger(__name__)
router = APIRouter()

_presets_cache: list[dict] | None = None


def _load_presets() -> list[dict]:
    global _presets_cache
    if _presets_cache is not None:
        return _presets_cache
    presets_path = Path(__file__).resolve().parent.parent.parent / "prompts" / "presets.json"
    try:
        with open(presets_path) as f:
            _presets_cache = json.load(f)
    except Exception as exc:
        logger.error("Failed to load presets: %s", exc)
        _presets_cache = []
    return _presets_cache


@router.get("/api/presets")
async def get_presets():
    presets = _load_presets()
    return {"presets": presets}
