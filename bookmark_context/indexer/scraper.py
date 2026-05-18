from __future__ import annotations
import re
import httpx
import trafilatura
from urllib.parse import urljoin, urlparse

_SPA_SHELL_PATTERNS: list[re.Pattern[str]] = [
    re.compile(p, re.IGNORECASE)
    for p in [
        r"you need to enable javascript",
        r"javascript (?:is )?required",
        r"enable javascript to (?:view|run|use|continue|load)",
        r"please enable javascript",
    ]
]


def is_spa_shell(text: str) -> bool:
    """True when extracted text is a JS-required placeholder, not real page content."""
    stripped = text.strip()
    if not stripped or len(stripped) > 300:
        return False
    return any(pat.search(stripped) for pat in _SPA_SHELL_PATTERNS)


def _fallback_plain_text(html: str) -> str:
    """Strip tags when trafilatura yields nothing useful from browser-captured HTML."""
    without_scripts = re.sub(
        r"<script[^>]*>[\s\S]*?</script>", " ", html, flags=re.IGNORECASE
    )
    without_styles = re.sub(
        r"<style[^>]*>[\s\S]*?</style>", " ", without_scripts, flags=re.IGNORECASE
    )
    plain = re.sub(r"<[^>]+>", " ", without_styles)
    return re.sub(r"\s+", " ", plain).strip()


def extract_text_from_html(html: str, url: str) -> str:
    result = trafilatura.extract(
        html,
        url=url,
        include_tables=True,
        include_comments=False,
        output_format="txt",
    )
    return result or ""


_USER_AGENT = "Mozilla/5.0 (compatible; BookmarkContext/0.1)"


def fetch_page_html(url: str, html: str | None = None) -> str:
    if html:
        return html
    try:
        response = httpx.get(
            url,
            timeout=15,
            follow_redirects=True,
            headers={"User-Agent": _USER_AGENT},
        )
        if response.status_code >= 400:
            return ""
        return response.text
    except (httpx.RequestError, httpx.HTTPStatusError):
        return ""


def extract_favicon(html: str, url: str) -> str:
    """Return favicon URL from HTML <link rel="icon">, falling back to /favicon.ico."""
    patterns = [
        r'<link[^>]+rel=["\'](?:shortcut )?icon["\'][^>]*href=["\']([^"\']+)["\']',
        r'<link[^>]+href=["\']([^"\']+)["\'][^>]*rel=["\'](?:shortcut )?icon["\']',
    ]
    for pattern in patterns:
        match = re.search(pattern, html, re.IGNORECASE)
        if match:
            return urljoin(url, match.group(1))
    parsed = urlparse(url)
    return f"{parsed.scheme}://{parsed.netloc}/favicon.ico"


def scrape_url(url: str, html: str | None = None) -> str:
    page_html = fetch_page_html(url, html)
    if not page_html:
        return ""
    text = extract_text_from_html(page_html, url)
    if html and (not text.strip() or is_spa_shell(text)):
        fallback = _fallback_plain_text(page_html)
        if fallback and not is_spa_shell(fallback):
            return fallback
    return text
