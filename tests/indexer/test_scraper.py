import pytest
import respx
import httpx
from bookmark_context.indexer.scraper import scrape_url, extract_text_from_html


SAMPLE_HTML = """
<html><head><title>Test Page</title></head><body>
<nav>Skip this nav content</nav>
<article>
<h1>Main Article Title</h1>
<p>This is the main content of the article. It has enough words to pass the minimum
length check that trafilatura uses for content extraction.</p>
<p>Another paragraph with more meaningful content about the topic at hand.</p>
</article>
<footer>Skip this footer</footer>
</body></html>
"""


def test_extract_text_from_html():
    text = extract_text_from_html(SAMPLE_HTML, url="https://example.com")
    assert "Main Article Title" in text
    assert len(text) > 20


def test_extract_text_returns_empty_on_unparseable():
    text = extract_text_from_html("<html></html>", url="https://example.com")
    assert text == ""


@respx.mock
def test_scrape_url_fetches_and_extracts():
    respx.get("https://example.com/article").mock(
        return_value=httpx.Response(200, text=SAMPLE_HTML)
    )
    text = scrape_url("https://example.com/article")
    assert "Main Article Title" in text


@respx.mock
def test_scrape_url_returns_empty_on_http_error():
    respx.get("https://example.com/missing").mock(
        return_value=httpx.Response(404)
    )
    text = scrape_url("https://example.com/missing")
    assert text == ""


def test_scrape_url_returns_empty_on_request_error():
    with respx.mock:
        respx.get("https://example.com/timeout").mock(side_effect=httpx.ConnectError("refused"))
        text = scrape_url("https://example.com/timeout")
    assert text == ""


def test_scrape_url_uses_provided_html():
    text = scrape_url("https://example.com", html=SAMPLE_HTML)
    assert "Main Article Title" in text
