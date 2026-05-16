import pytest
from unittest.mock import MagicMock
from bookmark_context.mcp.server import handle_list_collections, handle_search_collection, handle_ask_collection


def test_handle_list_collections():
    mock_db = MagicMock()
    mock_db.list_collections.return_value = [
        {
            "id": "col1",
            "name": "AI Research",
            "description": "Papers",
            "created_at": "2026-01-01",
            "updated_at": "2026-01-01",
            "bookmark_count": 2,
        }
    ]

    result = handle_list_collections(db=mock_db)
    assert len(result) == 1
    assert result[0]["name"] == "AI Research"
    assert result[0]["bookmark_count"] == 2


def test_handle_search_collection():
    mock_embedder = MagicMock()
    mock_embedder.embed.return_value = [[0.1, 0.2, 0.3]]

    mock_vs = MagicMock()
    mock_vs.query.return_value = [
        {"text": "relevant chunk", "metadata": {"url": "https://a.com", "title": "A"}, "score": 0.9}
    ]

    result = handle_search_collection(
        collection_id="col1",
        query="attention mechanisms",
        top_k=5,
        embedder=mock_embedder,
        vs=mock_vs,
    )
    assert len(result) == 1
    assert result[0]["text"] == "relevant chunk"
    assert result[0]["score"] == 0.9


def test_handle_ask_collection():
    mock_embedder = MagicMock()
    mock_embedder.embed.return_value = [[0.1, 0.2, 0.3]]

    mock_vs = MagicMock()
    mock_vs.query.return_value = [
        {"text": "transformers use self-attention", "metadata": {"url": "https://arxiv.org", "title": "Paper"}, "score": 0.95}
    ]

    result = handle_ask_collection(
        collection_id="col1",
        question="What do transformers use?",
        embedder=mock_embedder,
        vs=mock_vs,
    )
    assert result["question"] == "What do transformers use?"
    assert len(result["chunks"]) == 1
    assert result["chunks"][0]["text"] == "transformers use self-attention"
    assert result["chunks"][0]["url"] == "https://arxiv.org"
