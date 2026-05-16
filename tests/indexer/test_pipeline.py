import pytest
from unittest.mock import MagicMock, patch
from pathlib import Path
from bookmark_context.storage.database import Database
from bookmark_context.storage.vector_store import VectorStore
from bookmark_context.indexer.pipeline import IndexPipeline


@pytest.fixture
def db(tmp_path: Path):
    d = Database(tmp_path / "test.db")
    d.init()
    return d


@pytest.fixture
def vs(tmp_path: Path):
    return VectorStore(tmp_path / "chroma")


@pytest.fixture
def mock_embedder():
    embedder = MagicMock()
    embedder.embed.return_value = [[0.1, 0.2, 0.3]]
    return embedder


def test_index_bookmark_sets_status_done(db, vs, mock_embedder):
    coll_id = db.create_collection("Test", "")
    bm_id = db.add_bookmark(coll_id, "https://example.com", "Example")

    with patch("bookmark_context.indexer.pipeline.scrape_url", return_value="Some article content here"):
        pipeline = IndexPipeline(db=db, vs=vs, embedder=mock_embedder)
        pipeline.index_bookmark(bm_id)

    bm = db.get_bookmark(bm_id)
    assert bm["index_status"] == "done"
    assert bm["indexed_at"] is not None


def test_index_bookmark_stores_chunks(db, vs, mock_embedder):
    coll_id = db.create_collection("Test", "")
    bm_id = db.add_bookmark(coll_id, "https://example.com", "Example")

    mock_embedder.embed.return_value = [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]]

    with patch("bookmark_context.indexer.pipeline.scrape_url", return_value=" ".join(["word"] * 600)):
        pipeline = IndexPipeline(db=db, vs=vs, embedder=mock_embedder)
        pipeline.index_bookmark(bm_id)

    chunks = db.get_chunks_for_bookmark(bm_id)
    assert len(chunks) > 0


def test_index_bookmark_sets_error_on_empty_scrape(db, vs, mock_embedder):
    coll_id = db.create_collection("Test", "")
    bm_id = db.add_bookmark(coll_id, "https://example.com", "Example")

    with patch("bookmark_context.indexer.pipeline.scrape_url", return_value=""):
        pipeline = IndexPipeline(db=db, vs=vs, embedder=mock_embedder)
        pipeline.index_bookmark(bm_id)

    bm = db.get_bookmark(bm_id)
    assert bm["index_status"] == "error"
    assert "content" in bm["error_message"].lower()


def test_index_bookmark_accepts_prerendered_html(db, vs, mock_embedder):
    coll_id = db.create_collection("Test", "")
    bm_id = db.add_bookmark(coll_id, "https://example.com", "Example")

    with patch("bookmark_context.indexer.pipeline.scrape_url", return_value="extracted content") as mock_scrape:
        pipeline = IndexPipeline(db=db, vs=vs, embedder=mock_embedder)
        pipeline.index_bookmark(bm_id, html="<html><body>content</body></html>")
        mock_scrape.assert_called_once_with("https://example.com", html="<html><body>content</body></html>")
