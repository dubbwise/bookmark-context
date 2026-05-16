from __future__ import annotations
import subprocess
import time
import httpx
from mcp.server.fastmcp import FastMCP
from bookmark_context.config import load_config
from bookmark_context.storage.database import Database
from bookmark_context.storage.vector_store import VectorStore
from bookmark_context.indexer.embedder import Embedder
from bookmark_context.rag import ask_collection

mcp = FastMCP("bookmark-context")


def handle_list_collections(db: Database) -> list[dict]:
    return [
        {
            "id": c["id"],
            "name": c["name"],
            "description": c["description"],
            "bookmark_count": c["bookmark_count"],
            "last_indexed": c.get("updated_at", ""),
        }
        for c in db.list_collections()
    ]


def handle_search_collection(
    collection_id: str,
    query: str,
    top_k: int,
    embedder: Embedder,
    vs: VectorStore,
) -> list[dict]:
    query_embedding = embedder.embed([query])[0]
    results = vs.query(collection_id=collection_id, query_embedding=query_embedding, top_k=top_k)
    return [
        {
            "chunk": r["text"],
            "url": r["metadata"].get("url", ""),
            "title": r["metadata"].get("title", ""),
            "score": r["score"],
        }
        for r in results
    ]


def handle_ask_collection(
    collection_id: str,
    question: str,
    embedder: Embedder,
    vs: VectorStore,
    ai,
) -> dict:
    return ask_collection(
        collection_id=collection_id,
        question=question,
        embedder=embedder,
        vs=vs,
        ai=ai,
    )


def _ensure_daemon(port: int) -> None:
    url = f"http://localhost:{port}/status"
    try:
        httpx.get(url, timeout=1)
        return
    except (httpx.ConnectError, httpx.TimeoutException):
        pass
    subprocess.Popen(["bookmark-context", "serve"])
    for _ in range(20):
        time.sleep(0.5)
        try:
            httpx.get(url, timeout=1)
            return
        except (httpx.ConnectError, httpx.TimeoutException):
            continue
    raise RuntimeError("Daemon failed to start within 10 seconds")


def run_mcp_server() -> None:
    config = load_config()
    _ensure_daemon(config.daemon_port)

    db = Database(config.db_path)
    db.init()
    vs = VectorStore(config.chroma_path)
    embedder = Embedder(config.embed_model)

    from bookmark_context.api.bookmarks import _get_ai_adapter
    ai = _get_ai_adapter(config)

    @mcp.tool()
    def list_collections() -> list[dict]:
        """List all bookmark collections with their bookmark counts."""
        return handle_list_collections(db)

    @mcp.tool()
    def search_collection(collection_id: str, query: str, top_k: int = 5) -> list[dict]:
        """Semantic search over a bookmark collection. Returns relevant text chunks with source URLs."""
        return handle_search_collection(collection_id, query, top_k, embedder, vs)

    @mcp.tool()
    def ask_collection(collection_id: str, question: str) -> dict:
        """Ask a question about a bookmark collection. Returns an AI-generated answer with cited sources."""
        return handle_ask_collection(collection_id, question, embedder, vs, ai)

    mcp.run()
