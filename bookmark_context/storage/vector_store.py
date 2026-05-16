from __future__ import annotations
from pathlib import Path
import chromadb


class VectorStore:
    def __init__(self, path: Path) -> None:
        path.mkdir(parents=True, exist_ok=True)
        self._client = chromadb.PersistentClient(path=str(path))

    def _collection(self, collection_id: str):
        return self._client.get_or_create_collection(
            name=f"col_{collection_id}",
            metadata={"hnsw:space": "cosine"},
        )

    def add_chunks(
        self,
        collection_id: str,
        chroma_ids: list[str],
        texts: list[str],
        embeddings: list[list[float]],
        metadatas: list[dict],
    ) -> list[str]:
        coll = self._collection(collection_id)
        coll.upsert(ids=chroma_ids, documents=texts, embeddings=embeddings, metadatas=metadatas)
        return chroma_ids

    def query(
        self, collection_id: str, query_embedding: list[float], top_k: int = 5
    ) -> list[dict]:
        try:
            coll = self._client.get_collection(f"col_{collection_id}")
        except Exception:
            return []
        count = coll.count()
        if count == 0:
            return []
        results = coll.query(
            query_embeddings=[query_embedding],
            n_results=min(top_k, count),
            include=["documents", "metadatas", "distances"],
        )
        out = []
        for i, doc_id in enumerate(results["ids"][0]):
            out.append({
                "chroma_id": doc_id,
                "text": results["documents"][0][i],
                "metadata": results["metadatas"][0][i],
                "score": 1 - results["distances"][0][i],
            })
        return out

    def delete_collection(self, collection_id: str) -> None:
        try:
            self._client.delete_collection(f"col_{collection_id}")
        except Exception:
            pass

    def delete_bookmark_chunks(self, collection_id: str, bookmark_id: str) -> None:
        try:
            coll = self._client.get_collection(f"col_{collection_id}")
        except Exception:
            return
        results = coll.get(where={"bookmark_id": bookmark_id})
        if results["ids"]:
            coll.delete(ids=results["ids"])
