from __future__ import annotations

from urllib.parse import urlparse


def favicon_key(url: str, favicon_url: str = "") -> str:
    stored = (favicon_url or "").strip()
    if stored:
        return stored
    try:
        parsed = urlparse(url)
        if parsed.scheme and parsed.netloc:
            return f"{parsed.scheme}://{parsed.netloc}/favicon.ico"
    except Exception:
        pass
    return ""
