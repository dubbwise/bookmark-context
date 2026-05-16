from __future__ import annotations
from bookmark_context.indexer.embedder import Embedder
from bookmark_context.storage.vector_store import VectorStore
from bookmark_context.ai.base import AIAdapter

SYSTEM_PROMPT = """You are a helpful assistant answering questions based on a collection of bookmarked web pages.
Use only the provided context to answer. If the context doesn't contain the answer, say so clearly.
Cite your sources by referring to the page titles when relevant."""


def ask_collection(
    collection_id: str,
    question: str,
    embedder: Embedder,
    vs: VectorStore,
    ai: AIAdapter,
    top_k: int = 5,
) -> dict:
    query_embedding = embedder.embed([question])[0]
    chunks = vs.query(collection_id=collection_id, query_embedding=query_embedding, top_k=top_k)

    if not chunks:
        return {"answer": "No indexed content found in this collection.", "sources": []}

    context_parts = []
    for i, chunk in enumerate(chunks):
        title = chunk["metadata"].get("title", "Unknown")
        url = chunk["metadata"].get("url", "")
        context_parts.append(f"[{i+1}] From '{title}' ({url}):\n{chunk['text']}")

    context = "\n\n".join(context_parts)
    user_prompt = f"Context:\n{context}\n\nQuestion: {question}"
    answer = ai.complete(system=SYSTEM_PROMPT, user=user_prompt)

    sources = [
        {
            "url": c["metadata"].get("url", ""),
            "title": c["metadata"].get("title", ""),
            "excerpt": c["text"][:200],
        }
        for c in chunks
    ]
    return {"answer": answer, "sources": sources}
