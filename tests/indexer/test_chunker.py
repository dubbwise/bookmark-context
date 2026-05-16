from bookmark_context.indexer.chunker import chunk_text


def test_short_text_returns_single_chunk():
    text = "This is a short text."
    chunks = chunk_text(text, chunk_size=500, overlap=50)
    assert chunks == ["This is a short text."]


def test_long_text_splits_into_multiple_chunks():
    word = "word "
    text = word * 600  # 600 words, ~2400 chars, >500 tokens
    chunks = chunk_text(text, chunk_size=500, overlap=50)
    assert len(chunks) > 1


def test_chunks_have_overlap():
    # Build text from unique numbered words so we can verify overlap
    words = [f"word{i}" for i in range(200)]
    text = " ".join(words)
    chunks = chunk_text(text, chunk_size=100, overlap=20)
    assert len(chunks) >= 2
    # End of chunk 0 and start of chunk 1 should share words
    end_of_first = chunks[0].split()[-20:]
    start_of_second = chunks[1].split()[:20]
    overlap_words = set(end_of_first) & set(start_of_second)
    assert len(overlap_words) > 0


def test_empty_text_returns_empty_list():
    assert chunk_text("", chunk_size=500, overlap=50) == []


def test_no_chunk_exceeds_size_limit():
    word = "word "
    text = word * 1000
    chunks = chunk_text(text, chunk_size=500, overlap=50)
    for chunk in chunks:
        # approximate token count as word count
        assert len(chunk.split()) <= 550  # some tolerance for overlap
