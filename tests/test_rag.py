import pytest
from unittest.mock import MagicMock
from bookmark_context.rag import ask_collection


def test_ask_collection_returns_answer_with_sources():
    mock_embedder = MagicMock()
    mock_embedder.embed.return_value = [[0.1, 0.2, 0.3]]

    mock_vs = MagicMock()
    mock_vs.query.return_value = [
        {"text": "Attention is all you need.", "metadata": {"url": "https://arxiv.org/abs/1706.03762", "title": "Attention Paper"}, "score": 0.95},
        {"text": "Transformers use self-attention.", "metadata": {"url": "https://blog.example.com", "title": "Blog Post"}, "score": 0.88},
    ]

    mock_ai = MagicMock()
    mock_ai.complete.return_value = "Attention mechanisms allow models to focus on relevant parts of the input."

    result = ask_collection(
        collection_id="col1",
        question="What are attention mechanisms?",
        embedder=mock_embedder,
        vs=mock_vs,
        ai=mock_ai,
    )

    assert result["answer"] == "Attention mechanisms allow models to focus on relevant parts of the input."
    assert len(result["sources"]) == 2
    assert result["sources"][0]["url"] == "https://arxiv.org/abs/1706.03762"
    assert result["sources"][0]["title"] == "Attention Paper"
    assert "Attention is all you need" in result["sources"][0]["excerpt"]


def test_ask_collection_no_chunks_returns_empty():
    mock_embedder = MagicMock()
    mock_embedder.embed.return_value = [[0.1, 0.2, 0.3]]

    mock_vs = MagicMock()
    mock_vs.query.return_value = []

    mock_ai = MagicMock()

    result = ask_collection(
        collection_id="col1",
        question="anything?",
        embedder=mock_embedder,
        vs=mock_vs,
        ai=mock_ai,
    )

    assert result["answer"] == "No indexed content found in this collection."
    assert result["sources"] == []
    mock_ai.complete.assert_not_called()
