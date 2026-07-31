"""
Server-side Unsplash city-image lookup.

Exists so the Unsplash Access Key never ships inside the mobile bundle
(EXPO_PUBLIC_* vars are public by design). The client calls this endpoint;
the key stays server-only in settings.UNSPLASH_ACCESS_KEY.

Cost/abuse controls:
  * Auth required — anonymous callers can't burn Unsplash quota.
  * Per-IP rate limit on cache misses' front door.
  * In-process TTL cache (7 days) — repeated queries (city names are a small,
    stable set) hit Unsplash roughly once per city per week per process.
    Stale-if-error: on upstream failure a stale cached entry is served.
  * Query length capped; only the URL + attribution fields are returned
    (Unsplash requires photographer + Unsplash attribution; hotlinking the
    returned photo URLs is what Unsplash's guidelines specify).

# ponytail: in-process cache; move to Redis/DB if multi-instance quota
# pressure appears.
"""

from __future__ import annotations

import json
import threading
import time
from urllib.error import URLError
from urllib.parse import urlencode
from urllib.request import Request as UrlRequest, urlopen

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.core.config import settings
from app.core.deps import get_current_user
from app.core.rate_limit import rate_limiter

router = APIRouter(prefix="/images", tags=["images"])

_CACHE_TTL = 7 * 24 * 3600
# (result | None, fetched_at) per normalized query. None = "no photo found".
_cache: dict[str, tuple[dict | None, float]] = {}
_cache_lock = threading.Lock()
_MAX_CACHE_ENTRIES = 2000

_images_limit = rate_limiter("images_city", limit=30, window_seconds=60)


class CityImageOut(BaseModel):
    url: str
    credit: str


def _fetch_unsplash(query: str) -> dict | None:
    qs = urlencode({"query": query, "orientation": "landscape", "per_page": 1})
    req = UrlRequest(
        f"https://api.unsplash.com/search/photos?{qs}",
        headers={
            "Authorization": f"Client-ID {settings.UNSPLASH_ACCESS_KEY}",
            "Accept-Version": "v1",
        },
    )
    with urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read())
    photo = (data.get("results") or [None])[0]
    if not photo or not photo.get("urls", {}).get("regular"):
        return None
    name = (photo.get("user") or {}).get("name")
    return {
        "url": photo["urls"]["regular"],
        "credit": f"{name} · Unsplash" if name else "Unsplash",
    }


@router.get(
    "/city",
    response_model=CityImageOut | None,
    dependencies=[Depends(get_current_user), Depends(_images_limit)],
)
def get_city_image(query: str = Query(..., min_length=1, max_length=80)):
    """Return one landscape photo (URL + attribution) for a city/place query.

    `null` body = no photo available; the client falls back to a colored block.
    """
    if not settings.UNSPLASH_ACCESS_KEY:
        raise HTTPException(status_code=503, detail="Image lookup not configured")

    key = query.strip().lower()
    now = time.time()
    with _cache_lock:
        cached = _cache.get(key)
    if cached and now - cached[1] < _CACHE_TTL:
        return cached[0]

    try:
        result = _fetch_unsplash(key)
    except (URLError, TimeoutError, ValueError, OSError):
        if cached:  # stale-if-error: serve the expired entry rather than fail
            return cached[0]
        raise HTTPException(status_code=503, detail="Image lookup unavailable")

    with _cache_lock:
        if len(_cache) >= _MAX_CACHE_ENTRIES:
            _cache.clear()  # ponytail: crude bound; LRU if it ever matters
        _cache[key] = (result, now)
    return result
