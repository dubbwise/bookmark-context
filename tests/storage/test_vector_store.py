import pytest
from pathlib import Path
from bookmark_context.storage.vector_store import VectorStore


@pytest.fixture
def vs(tmp_path: Path):
    return VectorStore(tmp_path / "chroma")


def test_add_and_query_chunks(vs: VectorStore):
    embeddings = [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6], [0.9, 0.1, 0.0]]
    ids = vs.add_chunks(
        collection_id="col1",
        chroma_ids=["c1", "c2", "c3"],
        texts=["hello world", "foo bar", "completely different"],
        embeddings=embeddings,
        metadatas=[
            {"url": "https://a.com", "title": "A"},
            {"url": "https://b.com", "title": "B"},
            {"url": "https://c.com", "title": "C"},
        ],
    )
    assert ids == ["c1", "c2", "c3"]

    results = vs.query(collection_id="col1", query_embedding=[0.1, 0.2, 0.3], top_k=2)
    assert len(results) == 2
    assert results[0]["chroma_id"] == "c1"


def test_delete_collection(vs: VectorStore):
    vs.add_chunks(
        collection_id="col1",
        chroma_ids=["c1"],
        texts=["text"],
        embeddings=[[0.1, 0.2, 0.3]],
        metadatas=[{"url": "https://a.com", "title": "A"}],
    )
    vs.delete_collection("col1")
    results = vs.query(collection_id="col1", query_embedding=[0.1, 0.2, 0.3], top_k=5)
    assert results == []


def test_delete_bookmark_chunks(vs: VectorStore):
    vs.add_chunks(
        collection_id="col1",
        chroma_ids=["bm1-c0", "bm1-c1", "bm2-c0"],
        texts=["t1", "t2", "t3"],
        embeddings=[[0.1, 0.2, 0.3], [0.4, 0.5, 0.6], [0.7, 0.8, 0.9]],
        metadatas=[
            {"url": "https://a.com", "title": "A", "bookmark_id": "bm1"},
            {"url": "https://a.com", "title": "A", "bookmark_id": "bm1"},
            {"url": "https://b.com", "title": "B", "bookmark_id": "bm2"},
        ],
    )
    vs.delete_bookmark_chunks("col1", "bm1")
    results = vs.query(collection_id="col1", query_embedding=[0.1, 0.2, 0.3], top_k=5)
    assert all(r["metadata"]["bookmark_id"] == "bm2" for r in results)
