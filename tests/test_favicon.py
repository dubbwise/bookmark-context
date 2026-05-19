from bookmark_context.favicon import favicon_key


def test_favicon_key_prefers_stored_url():
    assert favicon_key("https://example.com/page", "https://cdn.example.com/icon.png") == (
        "https://cdn.example.com/icon.png"
    )


def test_favicon_key_falls_back_to_origin():
    assert favicon_key("https://example.com/page", "") == "https://example.com/favicon.ico"


def test_favicon_key_empty_for_invalid_url():
    assert favicon_key("not-a-url", "") == ""
