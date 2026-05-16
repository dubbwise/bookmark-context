import pytest
from unittest.mock import MagicMock, patch
from bookmark_context.indexer.embedder import Embedder


def test_embed_returns_vectors():
    mock_model = MagicMock()
    mock_model.embed.return_value = iter([[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]])

    with patch("bookmark_context.indexer.embedder.TextEmbedding", return_value=mock_model):
        embedder = Embedder("BAAI/bge-small-en-v1.5")
        result = embedder.embed(["hello", "world"])

    assert len(result) == 2
    assert result[0] == [0.1, 0.2, 0.3]
    assert result[1] == [0.4, 0.5, 0.6]


def test_embed_single_text():
    mock_model = MagicMock()
    mock_model.embed.return_value = iter([[0.1, 0.2, 0.3]])

    with patch("bookmark_context.indexer.embedder.TextEmbedding", return_value=mock_model):
        embedder = Embedder("BAAI/bge-small-en-v1.5")
        result = embedder.embed(["just one"])

    assert len(result) == 1
