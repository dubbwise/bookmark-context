from __future__ import annotations
import httpx
import trafilatura


def extract_text_from_html(html: str, url: str) -> str:
    result = trafilatura.extract(
        html,
        url=url,
        include_tables=True,
        include_comments=False,
        output_format="txt",
    )
    return result or ""


def scrape_url(url: str, html: str | None = None) -> str:
    if html:
        return extract_text_from_html(html, url)
    try:
        response = httpx.get(url, timeout=15, follow_redirects=True, headers={
            "User-Agent": "Mozilla/5.0 (compatible; BookmarkContext/0.1)"
        })
        if response.status_code >= 400:
            return ""
        return extract_text_from_html(response.text, url)
    except (httpx.RequestError, httpx.HTTPStatusError):
        return ""
