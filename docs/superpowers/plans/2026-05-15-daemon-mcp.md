# Bookmark Context — Daemon & MCP Server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local Python daemon (FastAPI + SQLite + ChromaDB) that indexes bookmarked web pages and answers questions via RAG, plus a stdio MCP server exposing three tools to Cursor.

**Architecture:** A single Python package (`bookmark_context`) with a FastAPI REST server on `localhost:7331` as the core. A CLI entry point (`bookmark-context serve | mcp`) starts either the HTTP daemon or the stdio MCP server. The MCP server auto-starts the daemon as a subprocess when Cursor invokes it. Embeddings always use a local `fastembed` model; Claude API or Ollama is used only for chat completion.

**Tech Stack:** Python 3.11+, FastAPI, uvicorn, sqlite3 (stdlib), chromadb, fastembed, trafilatura, httpx, anthropic, mcp (Anthropic MCP SDK — `pip install mcp`), pytest, pytest-asyncio, tomllib (stdlib 3.11+)

---

## File Map

```
bookmark_context/
├── __init__.py
├── cli.py                      # CLI: bookmark-context serve | mcp
├── config.py                   # Config dataclass + load_config()
├── rag.py                      # RAG: embed question → search → AI complete
├── ai/
│   ├── __init__.py
│   ├── base.py                 # AIAdapter Protocol
│   ├── claude.py               # Anthropic SDK adapter
│   └── ollama.py               # Ollama HTTP adapter
├── api/
│   ├── __init__.py
│   ├── app.py                  # FastAPI app factory + /status
│   ├── schemas.py              # Pydantic request/response models
│   ├── collections.py          # /collections routes
│   └── bookmarks.py            # /bookmarks + /ask routes
├── indexer/
│   ├── __init__.py
│   ├── scraper.py              # httpx fetch + trafilatura extraction
│   ├── chunker.py              # text → 500-token chunks with overlap
│   ├── embedder.py             # fastembed wrapper
│   └── pipeline.py             # scrape → chunk → embed → store
├── mcp/
│   ├── __init__.py
│   └── server.py               # stdio MCP server (3 tools)
└── storage/
    ├── __init__.py
    ├── database.py             # SQLite schema + CRUD
    └── vector_store.py         # ChromaDB wrapper

tests/
├── conftest.py                 # shared fixtures
├── test_config.py
├── test_rag.py
├── api/
│   ├── test_collections.py
│   └── test_bookmarks.py
├── indexer/
│   ├── test_scraper.py
│   ├── test_chunker.py
│   └── test_pipeline.py
├── mcp/
│   └── test_server.py
└── storage/
    ├── test_database.py
    └── test_vector_store.py

pyproject.toml
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `pyproject.toml`
- Create: `bookmark_context/__init__.py`
- Create: `bookmark_context/cli.py` (stub)
- Create: `tests/conftest.py` (empty)

- [ ] **Step 1: Create pyproject.toml**

```toml
[build-system]
requires = ["setuptools>=68"]
build-backend = "setuptools.backends.legacy:build"

[project]
name = "bookmark-context"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.111",
    "uvicorn[standard]>=0.29",
    "httpx>=0.27",
    "trafilatura>=1.9",
    "fastembed>=0.3",
    "chromadb>=0.5",
    "anthropic>=0.28",
    "mcp>=1.0",
    "pydantic>=2.7",
]

[project.scripts]
bookmark-context = "bookmark_context.cli:main"

[project.optional-dependencies]
dev = [
    "pytest>=8",
    "pytest-asyncio>=0.23",
    "httpx>=0.27",  # AsyncClient for tests
    "respx>=0.21",  # mock httpx
]

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
```

- [ ] **Step 2: Create package init and stub CLI**

`bookmark_context/__init__.py`:
```python
```

`bookmark_context/cli.py`:
```python
import sys


def main() -> None:
    if len(sys.argv) < 2 or sys.argv[1] not in ("serve", "mcp"):
        print("Usage: bookmark-context <serve|mcp>")
        sys.exit(1)


if __name__ == "__main__":
    main()
```

`tests/conftest.py`:
```python
```

- [ ] **Step 3: Install in editable mode and verify CLI**

```bash
pip install -e ".[dev]"
bookmark-context
```

Expected output:
```
Usage: bookmark-context <serve|mcp>
```

- [ ] **Step 4: Commit**

```bash
git add pyproject.toml bookmark_context/ tests/
git commit -m "feat: project scaffold"
```

---

## Task 2: Config Module

**Files:**
- Create: `bookmark_context/config.py`
- Create: `tests/test_config.py`

- [ ] **Step 1: Write the failing test**

`tests/test_config.py`:
```python
import tomllib
from pathlib import Path
from bookmark_context.config import Config, load_config


def test_load_config_defaults(tmp_path: Path):
    config = load_config(config_path=tmp_path / "config.toml")
    assert config.daemon_port == 7331
    assert config.ai_backend == "claude"
    assert config.claude_chat_model == "claude-sonnet-4-6"
    assert config.ollama_base_url == "http://localhost:11434"
    assert config.ollama_chat_model == "llama3"
    assert config.embed_model == "BAAI/bge-small-en-v1.5"


def test_load_config_from_toml(tmp_path: Path):
    toml_content = """
[ai]
backend = "ollama"

[ollama]
chat_model = "mistral"
"""
    config_file = tmp_path / "config.toml"
    config_file.write_text(toml_content)
    config = load_config(config_path=config_file)
    assert config.ai_backend == "ollama"
    assert config.ollama_chat_model == "mistral"
    assert config.daemon_port == 7331  # default preserved
```

- [ ] **Step 2: Run to confirm failure**

```bash
pytest tests/test_config.py -v
```

Expected: `ImportError` or `ModuleNotFoundError`

- [ ] **Step 3: Implement config module**

`bookmark_context/config.py`:
```python
from __future__ import annotations
import tomllib
from dataclasses import dataclass, field
from pathlib import Path


DEFAULT_CONFIG_PATH = Path.home() / ".config" / "bookmark-context" / "config.toml"


@dataclass
class Config:
    daemon_port: int = 7331
    ai_backend: str = "claude"
    claude_api_key: str = ""
    claude_chat_model: str = "claude-sonnet-4-6"
    ollama_base_url: str = "http://localhost:11434"
    ollama_chat_model: str = "llama3"
    embed_model: str = "BAAI/bge-small-en-v1.5"
    db_path: Path = field(default_factory=lambda: Path.home() / ".local" / "share" / "bookmark-context" / "bookmarks.db")
    chroma_path: Path = field(default_factory=lambda: Path.home() / ".local" / "share" / "bookmark-context" / "chroma")


def load_config(config_path: Path = DEFAULT_CONFIG_PATH) -> Config:
    if not config_path.exists():
        return Config()
    with open(config_path, "rb") as f:
        data = tomllib.load(f)
    cfg = Config()
    if "daemon" in data:
        cfg.daemon_port = data["daemon"].get("port", cfg.daemon_port)
    if "ai" in data:
        cfg.ai_backend = data["ai"].get("backend", cfg.ai_backend)
    if "claude" in data:
        cfg.claude_api_key = data["claude"].get("api_key", cfg.claude_api_key)
        cfg.claude_chat_model = data["claude"].get("chat_model", cfg.claude_chat_model)
    if "ollama" in data:
        cfg.ollama_base_url = data["ollama"].get("base_url", cfg.ollama_base_url)
        cfg.ollama_chat_model = data["ollama"].get("chat_model", cfg.ollama_chat_model)
    if "embedder" in data:
        cfg.embed_model = data["embedder"].get("model", cfg.embed_model)
    return cfg
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
pytest tests/test_config.py -v
```

Expected: `2 passed`

- [ ] **Step 5: Commit**

```bash
git add bookmark_context/config.py tests/test_config.py
git commit -m "feat: config module with TOML loading and defaults"
```

---

## Task 3: SQLite Storage

**Files:**
- Create: `bookmark_context/storage/__init__.py`
- Create: `bookmark_context/storage/database.py`
- Create: `tests/storage/test_database.py`

- [ ] **Step 1: Write the failing tests**

`tests/storage/__init__.py`:
```python
```

`tests/storage/test_database.py`:
```python
import pytest
from pathlib import Path
from bookmark_context.storage.database import Database


@pytest.fixture
def db(tmp_path: Path):
    d = Database(tmp_path / "test.db")
    d.init()
    return d


def test_create_and_list_collection(db: Database):
    coll_id = db.create_collection("AI Research", "Papers and blog posts")
    colls = db.list_collections()
    assert len(colls) == 1
    assert colls[0]["name"] == "AI Research"
    assert colls[0]["id"] == coll_id


def test_delete_collection(db: Database):
    coll_id = db.create_collection("Temp", "")
    db.delete_collection(coll_id)
    assert db.list_collections() == []


def test_add_and_list_bookmarks(db: Database):
    coll_id = db.create_collection("Research", "")
    bm_id = db.add_bookmark(coll_id, "https://example.com", "Example")
    bookmarks = db.list_bookmarks(coll_id)
    assert len(bookmarks) == 1
    assert bookmarks[0]["url"] == "https://example.com"
    assert bookmarks[0]["index_status"] == "pending"
    assert bookmarks[0]["id"] == bm_id


def test_update_bookmark_status(db: Database):
    coll_id = db.create_collection("Research", "")
    bm_id = db.add_bookmark(coll_id, "https://example.com", "Example")
    db.update_bookmark_status(bm_id, "done")
    bm = db.get_bookmark(bm_id)
    assert bm["index_status"] == "done"


def test_add_chunks(db: Database):
    coll_id = db.create_collection("Research", "")
    bm_id = db.add_bookmark(coll_id, "https://example.com", "Example")
    db.add_chunks(bm_id, [("chunk text one", "chroma-1"), ("chunk text two", "chroma-2")])
    chunks = db.get_chunks_for_bookmark(bm_id)
    assert len(chunks) == 2
    assert chunks[0]["content"] == "chunk text one"


def test_delete_bookmark(db: Database):
    coll_id = db.create_collection("Research", "")
    bm_id = db.add_bookmark(coll_id, "https://example.com", "Example")
    db.delete_bookmark(bm_id)
    assert db.list_bookmarks(coll_id) == []


def test_duplicate_url_returns_existing(db: Database):
    coll_id = db.create_collection("Research", "")
    id1 = db.add_bookmark(coll_id, "https://example.com", "Example")
    id2 = db.add_bookmark(coll_id, "https://example.com", "Example Again")
    assert id1 == id2
```

- [ ] **Step 2: Run to confirm failure**

```bash
pytest tests/storage/test_database.py -v
```

Expected: `ImportError`

- [ ] **Step 3: Implement database module**

`bookmark_context/storage/__init__.py`:
```python
```

`bookmark_context/storage/database.py`:
```python
from __future__ import annotations
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class Database:
    def __init__(self, path: Path) -> None:
        self.path = path

    def _connect(self) -> sqlite3.Connection:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(self.path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        return conn

    def init(self) -> None:
        with self._connect() as conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS collections (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT NOT NULL DEFAULT '',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS bookmarks (
                    id TEXT PRIMARY KEY,
                    collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
                    url TEXT NOT NULL,
                    title TEXT NOT NULL DEFAULT '',
                    favicon_url TEXT NOT NULL DEFAULT '',
                    added_at TEXT NOT NULL,
                    indexed_at TEXT,
                    index_status TEXT NOT NULL DEFAULT 'pending'
                        CHECK(index_status IN ('pending','indexing','done','error')),
                    error_message TEXT
                );
                CREATE UNIQUE INDEX IF NOT EXISTS idx_bookmarks_collection_url
                    ON bookmarks(collection_id, url);
                CREATE TABLE IF NOT EXISTS chunks (
                    id TEXT PRIMARY KEY,
                    bookmark_id TEXT NOT NULL REFERENCES bookmarks(id) ON DELETE CASCADE,
                    content TEXT NOT NULL,
                    chunk_index INTEGER NOT NULL,
                    chroma_id TEXT NOT NULL
                );
            """)

    def create_collection(self, name: str, description: str) -> str:
        coll_id = str(uuid.uuid4())
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO collections (id, name, description, created_at, updated_at) VALUES (?,?,?,?,?)",
                (coll_id, name, description, _now(), _now()),
            )
        return coll_id

    def list_collections(self) -> list[dict]:
        with self._connect() as conn:
            rows = conn.execute("SELECT * FROM collections ORDER BY created_at").fetchall()
        return [dict(r) for r in rows]

    def get_collection(self, coll_id: str) -> dict | None:
        with self._connect() as conn:
            row = conn.execute("SELECT * FROM collections WHERE id = ?", (coll_id,)).fetchone()
        return dict(row) if row else None

    def delete_collection(self, coll_id: str) -> None:
        with self._connect() as conn:
            conn.execute("DELETE FROM collections WHERE id = ?", (coll_id,))

    def add_bookmark(self, collection_id: str, url: str, title: str) -> str:
        with self._connect() as conn:
            existing = conn.execute(
                "SELECT id FROM bookmarks WHERE collection_id = ? AND url = ?",
                (collection_id, url),
            ).fetchone()
            if existing:
                return existing["id"]
            bm_id = str(uuid.uuid4())
            conn.execute(
                "INSERT INTO bookmarks (id, collection_id, url, title, added_at, index_status) VALUES (?,?,?,?,?,?)",
                (bm_id, collection_id, url, title, _now(), "pending"),
            )
        return bm_id

    def get_bookmark(self, bm_id: str) -> dict | None:
        with self._connect() as conn:
            row = conn.execute("SELECT * FROM bookmarks WHERE id = ?", (bm_id,)).fetchone()
        return dict(row) if row else None

    def list_bookmarks(self, collection_id: str) -> list[dict]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM bookmarks WHERE collection_id = ? ORDER BY added_at DESC",
                (collection_id,),
            ).fetchall()
        return [dict(r) for r in rows]

    def update_bookmark_status(self, bm_id: str, status: str, error_message: str | None = None) -> None:
        with self._connect() as conn:
            if status == "done":
                conn.execute(
                    "UPDATE bookmarks SET index_status = ?, indexed_at = ?, error_message = NULL WHERE id = ?",
                    (status, _now(), bm_id),
                )
            else:
                conn.execute(
                    "UPDATE bookmarks SET index_status = ?, error_message = ? WHERE id = ?",
                    (status, error_message, bm_id),
                )

    def add_chunks(self, bookmark_id: str, chunks: list[tuple[str, str]]) -> None:
        with self._connect() as conn:
            conn.execute("DELETE FROM chunks WHERE bookmark_id = ?", (bookmark_id,))
            conn.executemany(
                "INSERT INTO chunks (id, bookmark_id, content, chunk_index, chroma_id) VALUES (?,?,?,?,?)",
                [(str(uuid.uuid4()), bookmark_id, text, i, chroma_id) for i, (text, chroma_id) in enumerate(chunks)],
            )

    def get_chunks_for_bookmark(self, bookmark_id: str) -> list[dict]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM chunks WHERE bookmark_id = ? ORDER BY chunk_index",
                (bookmark_id,),
            ).fetchall()
        return [dict(r) for r in rows]

    def delete_bookmark(self, bm_id: str) -> None:
        with self._connect() as conn:
            conn.execute("DELETE FROM bookmarks WHERE id = ?", (bm_id,))
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
pytest tests/storage/test_database.py -v
```

Expected: `7 passed`

- [ ] **Step 5: Commit**

```bash
git add bookmark_context/storage/ tests/storage/
git commit -m "feat: SQLite storage with collections, bookmarks, chunks"
```

---

## Task 4: ChromaDB Vector Store

**Files:**
- Create: `bookmark_context/storage/vector_store.py`
- Create: `tests/storage/test_vector_store.py`

- [ ] **Step 1: Write the failing tests**

`tests/storage/test_vector_store.py`:
```python
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
```

- [ ] **Step 2: Run to confirm failure**

```bash
pytest tests/storage/test_vector_store.py -v
```

Expected: `ImportError`

- [ ] **Step 3: Implement vector store**

`bookmark_context/storage/vector_store.py`:
```python
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
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
pytest tests/storage/test_vector_store.py -v
```

Expected: `3 passed`

- [ ] **Step 5: Commit**

```bash
git add bookmark_context/storage/vector_store.py tests/storage/test_vector_store.py
git commit -m "feat: ChromaDB vector store wrapper"
```

---

## Task 5: Embedder

**Files:**
- Create: `bookmark_context/indexer/__init__.py`
- Create: `bookmark_context/indexer/embedder.py`
- Create: `tests/indexer/__init__.py`
- Create: `tests/indexer/test_embedder.py`

- [ ] **Step 1: Write the failing test**

`tests/indexer/__init__.py`:
```python
```

`tests/indexer/test_embedder.py`:
```python
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
```

- [ ] **Step 2: Run to confirm failure**

```bash
pytest tests/indexer/test_embedder.py -v
```

Expected: `ImportError`

- [ ] **Step 3: Implement embedder**

`bookmark_context/indexer/__init__.py`:
```python
```

`bookmark_context/indexer/embedder.py`:
```python
from __future__ import annotations
from fastembed import TextEmbedding


class Embedder:
    def __init__(self, model_name: str = "BAAI/bge-small-en-v1.5") -> None:
        self._model = TextEmbedding(model_name=model_name)

    def embed(self, texts: list[str]) -> list[list[float]]:
        return [v.tolist() for v in self._model.embed(texts)]
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
pytest tests/indexer/test_embedder.py -v
```

Expected: `2 passed`

- [ ] **Step 5: Commit**

```bash
git add bookmark_context/indexer/ tests/indexer/
git commit -m "feat: fastembed embedder wrapper"
```

---

## Task 6: Scraper

**Files:**
- Create: `bookmark_context/indexer/scraper.py`
- Create: `tests/indexer/test_scraper.py`

- [ ] **Step 1: Write the failing tests**

`tests/indexer/test_scraper.py`:
```python
import pytest
import respx
import httpx
from bookmark_context.indexer.scraper import scrape_url, extract_text_from_html


SAMPLE_HTML = """
<html><head><title>Test Page</title></head><body>
<nav>Skip this nav content</nav>
<article>
<h1>Main Article Title</h1>
<p>This is the main content of the article. It has enough words to pass the minimum
length check that trafilatura uses for content extraction.</p>
<p>Another paragraph with more meaningful content about the topic at hand.</p>
</article>
<footer>Skip this footer</footer>
</body></html>
"""


def test_extract_text_from_html():
    text = extract_text_from_html(SAMPLE_HTML, url="https://example.com")
    assert "Main Article Title" in text
    assert len(text) > 20


def test_extract_text_returns_empty_on_unparseable():
    text = extract_text_from_html("<html></html>", url="https://example.com")
    assert text == ""


@respx.mock
def test_scrape_url_fetches_and_extracts():
    respx.get("https://example.com/article").mock(
        return_value=httpx.Response(200, text=SAMPLE_HTML)
    )
    text = scrape_url("https://example.com/article")
    assert "Main Article Title" in text


@respx.mock
def test_scrape_url_returns_empty_on_http_error():
    respx.get("https://example.com/missing").mock(
        return_value=httpx.Response(404)
    )
    text = scrape_url("https://example.com/missing")
    assert text == ""


def test_scrape_url_uses_provided_html():
    text = scrape_url("https://example.com", html=SAMPLE_HTML)
    assert "Main Article Title" in text
```

- [ ] **Step 2: Run to confirm failure**

```bash
pytest tests/indexer/test_scraper.py -v
```

Expected: `ImportError`

- [ ] **Step 3: Implement scraper**

`bookmark_context/indexer/scraper.py`:
```python
from __future__ import annotations
import httpx
import trafilatura


def extract_text_from_html(html: str, url: str) -> str:
    result = trafilatura.extract(
        html,
        url=url,
        include_tables=True,
        include_comments=False,
        output_format="txt",
    )
    return result or ""


def scrape_url(url: str, html: str | None = None) -> str:
    if html:
        return extract_text_from_html(html, url)
    try:
        response = httpx.get(url, timeout=15, follow_redirects=True, headers={
            "User-Agent": "Mozilla/5.0 (compatible; BookmarkContext/0.1)"
        })
        if response.status_code >= 400:
            return ""
        return extract_text_from_html(response.text, url)
    except (httpx.RequestError, httpx.HTTPStatusError):
        return ""
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
pytest tests/indexer/test_scraper.py -v
```

Expected: `5 passed`

- [ ] **Step 5: Commit**

```bash
git add bookmark_context/indexer/scraper.py tests/indexer/test_scraper.py
git commit -m "feat: web scraper with httpx + trafilatura"
```

---

## Task 7: Chunker

**Files:**
- Create: `bookmark_context/indexer/chunker.py`
- Create: `tests/indexer/test_chunker.py`

- [ ] **Step 1: Write the failing tests**

`tests/indexer/test_chunker.py`:
```python
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
```

- [ ] **Step 2: Run to confirm failure**

```bash
pytest tests/indexer/test_chunker.py -v
```

Expected: `ImportError`

- [ ] **Step 3: Implement chunker**

`bookmark_context/indexer/chunker.py`:
```python
from __future__ import annotations


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    if not text.strip():
        return []
    words = text.split()
    if len(words) <= chunk_size:
        return [text]
    chunks = []
    start = 0
    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunks.append(" ".join(words[start:end]))
        if end == len(words):
            break
        start += chunk_size - overlap
    return chunks
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
pytest tests/indexer/test_chunker.py -v
```

Expected: `5 passed`

- [ ] **Step 5: Commit**

```bash
git add bookmark_context/indexer/chunker.py tests/indexer/test_chunker.py
git commit -m "feat: text chunker with configurable size and overlap"
```

---

## Task 8: Indexing Pipeline

**Files:**
- Create: `bookmark_context/indexer/pipeline.py`
- Create: `tests/indexer/test_pipeline.py`

- [ ] **Step 1: Write the failing tests**

`tests/indexer/test_pipeline.py`:
```python
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
```

- [ ] **Step 2: Run to confirm failure**

```bash
pytest tests/indexer/test_pipeline.py -v
```

Expected: `ImportError`

- [ ] **Step 3: Implement pipeline**

`bookmark_context/indexer/pipeline.py`:
```python
from __future__ import annotations
import uuid
from bookmark_context.storage.database import Database
from bookmark_context.storage.vector_store import VectorStore
from bookmark_context.indexer.embedder import Embedder
from bookmark_context.indexer.scraper import scrape_url
from bookmark_context.indexer.chunker import chunk_text


class IndexPipeline:
    def __init__(self, db: Database, vs: VectorStore, embedder: Embedder) -> None:
        self.db = db
        self.vs = vs
        self.embedder = embedder

    def index_bookmark(self, bookmark_id: str, html: str | None = None) -> None:
        bm = self.db.get_bookmark(bookmark_id)
        if not bm:
            return

        self.db.update_bookmark_status(bookmark_id, "indexing")
        try:
            text = scrape_url(bm["url"], html=html)
            if not text:
                self.db.update_bookmark_status(bookmark_id, "error", "No content extracted from page")
                return

            chunks = chunk_text(text)
            embeddings = self.embedder.embed(chunks)

            chroma_ids = [f"{bookmark_id}-{i}" for i in range(len(chunks))]
            metadatas = [
                {"url": bm["url"], "title": bm["title"], "bookmark_id": bookmark_id}
                for _ in chunks
            ]
            self.vs.add_chunks(
                collection_id=bm["collection_id"],
                chroma_ids=chroma_ids,
                texts=chunks,
                embeddings=embeddings,
                metadatas=metadatas,
            )
            self.db.add_chunks(bookmark_id, list(zip(chunks, chroma_ids)))
            self.db.update_bookmark_status(bookmark_id, "done")
        except Exception as e:
            self.db.update_bookmark_status(bookmark_id, "error", str(e))
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
pytest tests/indexer/test_pipeline.py -v
```

Expected: `4 passed`

- [ ] **Step 5: Commit**

```bash
git add bookmark_context/indexer/pipeline.py tests/indexer/test_pipeline.py
git commit -m "feat: indexing pipeline — scrape, chunk, embed, store"
```

---

## Task 9: AI Adapters

**Files:**
- Create: `bookmark_context/ai/__init__.py`
- Create: `bookmark_context/ai/base.py`
- Create: `bookmark_context/ai/claude.py`
- Create: `bookmark_context/ai/ollama.py`
- Create: `tests/ai/__init__.py`
- Create: `tests/ai/test_adapters.py`

- [ ] **Step 1: Write the failing tests**

`tests/ai/__init__.py`:
```python
```

`tests/ai/test_adapters.py`:
```python
import pytest
import respx
import httpx
from unittest.mock import MagicMock, patch
from bookmark_context.ai.claude import ClaudeAdapter
from bookmark_context.ai.ollama import OllamaAdapter


def test_claude_adapter_complete():
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text="Paris")]
    mock_client.messages.create.return_value = mock_response

    with patch("bookmark_context.ai.claude.anthropic.Anthropic", return_value=mock_client):
        adapter = ClaudeAdapter(api_key="sk-test", model="claude-sonnet-4-6")
        result = adapter.complete(system="You are helpful.", user="What is the capital of France?")

    assert result == "Paris"
    mock_client.messages.create.assert_called_once()
    call_kwargs = mock_client.messages.create.call_args.kwargs
    assert call_kwargs["model"] == "claude-sonnet-4-6"
    assert call_kwargs["system"] == "You are helpful."


@respx.mock
def test_ollama_adapter_complete():
    respx.post("http://localhost:11434/api/chat").mock(
        return_value=httpx.Response(200, json={
            "message": {"content": "The answer is 42."}
        })
    )
    adapter = OllamaAdapter(base_url="http://localhost:11434", model="llama3")
    result = adapter.complete(system="You are helpful.", user="What is the answer?")
    assert result == "The answer is 42."
```

- [ ] **Step 2: Run to confirm failure**

```bash
pytest tests/ai/test_adapters.py -v
```

Expected: `ImportError`

- [ ] **Step 3: Implement AI adapters**

`bookmark_context/ai/__init__.py`:
```python
```

`bookmark_context/ai/base.py`:
```python
from typing import Protocol


class AIAdapter(Protocol):
    def complete(self, system: str, user: str) -> str:
        ...
```

`bookmark_context/ai/claude.py`:
```python
from __future__ import annotations
import anthropic


class ClaudeAdapter:
    def __init__(self, api_key: str, model: str) -> None:
        self._client = anthropic.Anthropic(api_key=api_key)
        self._model = model

    def complete(self, system: str, user: str) -> str:
        response = self._client.messages.create(
            model=self._model,
            max_tokens=1024,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        return response.content[0].text
```

`bookmark_context/ai/ollama.py`:
```python
from __future__ import annotations
import httpx


class OllamaAdapter:
    def __init__(self, base_url: str, model: str) -> None:
        self._base_url = base_url.rstrip("/")
        self._model = model

    def complete(self, system: str, user: str) -> str:
        response = httpx.post(
            f"{self._base_url}/api/chat",
            json={
                "model": self._model,
                "stream": False,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
            },
            timeout=60,
        )
        response.raise_for_status()
        return response.json()["message"]["content"]
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
pytest tests/ai/test_adapters.py -v
```

Expected: `2 passed`

- [ ] **Step 5: Commit**

```bash
git add bookmark_context/ai/ tests/ai/
git commit -m "feat: Claude and Ollama AI adapters"
```

---

## Task 10: RAG Module

**Files:**
- Create: `bookmark_context/rag.py`
- Create: `tests/test_rag.py`

- [ ] **Step 1: Write the failing tests**

`tests/test_rag.py`:
```python
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
```

- [ ] **Step 2: Run to confirm failure**

```bash
pytest tests/test_rag.py -v
```

Expected: `ImportError`

- [ ] **Step 3: Implement RAG module**

`bookmark_context/rag.py`:
```python
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
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
pytest tests/test_rag.py -v
```

Expected: `2 passed`

- [ ] **Step 5: Commit**

```bash
git add bookmark_context/rag.py tests/test_rag.py
git commit -m "feat: RAG module — embed, retrieve, prompt, answer"
```

---

## Task 11: FastAPI App + /status Endpoint

**Files:**
- Create: `bookmark_context/api/__init__.py`
- Create: `bookmark_context/api/schemas.py`
- Create: `bookmark_context/api/app.py`
- Create: `tests/api/__init__.py`
- Create: `tests/api/test_status.py`

- [ ] **Step 1: Write the failing test**

`tests/api/__init__.py`:
```python
```

`tests/api/test_status.py`:
```python
import pytest
from pathlib import Path
from httpx import AsyncClient, ASGITransport
from bookmark_context.config import Config
from bookmark_context.api.app import create_app


@pytest.fixture
def config(tmp_path: Path):
    return Config(
        db_path=tmp_path / "test.db",
        chroma_path=tmp_path / "chroma",
        ai_backend="claude",
        claude_api_key="sk-test",
    )


@pytest.fixture
async def client(config):
    app = create_app(config)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


async def test_status_returns_ok(client):
    response = await client.get("/status")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["ai_backend"] == "claude"
    assert "version" in data
```

- [ ] **Step 2: Run to confirm failure**

```bash
pytest tests/api/test_status.py -v
```

Expected: `ImportError`

- [ ] **Step 3: Implement app factory and schemas**

`bookmark_context/api/__init__.py`:
```python
```

`bookmark_context/api/schemas.py`:
```python
from __future__ import annotations
from pydantic import BaseModel


class CollectionCreate(BaseModel):
    name: str
    description: str = ""


class CollectionResponse(BaseModel):
    id: str
    name: str
    description: str
    created_at: str
    updated_at: str
    bookmark_count: int = 0


class BookmarkCreate(BaseModel):
    url: str
    title: str = ""
    html: str | None = None


class BookmarkResponse(BaseModel):
    id: str
    collection_id: str
    url: str
    title: str
    added_at: str
    indexed_at: str | None
    index_status: str
    error_message: str | None = None


class AskRequest(BaseModel):
    question: str


class AskResponse(BaseModel):
    answer: str
    sources: list[dict]
```

`bookmark_context/api/app.py`:
```python
from __future__ import annotations
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from bookmark_context.config import Config
from bookmark_context.storage.database import Database
from bookmark_context.storage.vector_store import VectorStore
from bookmark_context.indexer.embedder import Embedder


VERSION = "0.1.0"


def create_app(config: Config) -> FastAPI:
    db = Database(config.db_path)
    db.init()
    vs = VectorStore(config.chroma_path)
    embedder = Embedder(config.embed_model)

    app = FastAPI(title="bookmark-context")
    app.state.db = db
    app.state.vs = vs
    app.state.embedder = embedder
    app.state.config = config

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/status")
    def status():
        return {"status": "ok", "version": VERSION, "ai_backend": config.ai_backend}

    from bookmark_context.api.collections import router as collections_router
    from bookmark_context.api.bookmarks import router as bookmarks_router
    app.include_router(collections_router)
    app.include_router(bookmarks_router)

    return app
```

- [ ] **Step 4: Create placeholder routers so the app import doesn't fail**

`bookmark_context/api/collections.py` (stub — full implementation in Task 12):
```python
from fastapi import APIRouter
router = APIRouter()
```

`bookmark_context/api/bookmarks.py` (stub — full implementation in Task 13):
```python
from fastapi import APIRouter
router = APIRouter()
```

- [ ] **Step 5: Run tests to confirm pass**

```bash
pytest tests/api/test_status.py -v
```

Expected: `1 passed`

- [ ] **Step 6: Commit**

```bash
git add bookmark_context/api/ tests/api/
git commit -m "feat: FastAPI app factory with /status endpoint"
```

---

## Task 12: Collections API

**Files:**
- Modify: `bookmark_context/api/collections.py`
- Create: `tests/api/test_collections.py`

- [ ] **Step 1: Write the failing tests**

`tests/api/test_collections.py`:
```python
import pytest
from pathlib import Path
from httpx import AsyncClient, ASGITransport
from bookmark_context.config import Config
from bookmark_context.api.app import create_app


@pytest.fixture
def config(tmp_path: Path):
    return Config(db_path=tmp_path / "test.db", chroma_path=tmp_path / "chroma")


@pytest.fixture
async def client(config):
    app = create_app(config)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


async def test_create_collection(client):
    response = await client.post("/collections", json={"name": "AI Research", "description": "Papers"})
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "AI Research"
    assert "id" in data


async def test_list_collections_empty(client):
    response = await client.get("/collections")
    assert response.status_code == 200
    assert response.json() == []


async def test_list_collections_with_data(client):
    await client.post("/collections", json={"name": "Research", "description": ""})
    await client.post("/collections", json={"name": "TypeScript", "description": ""})
    response = await client.get("/collections")
    assert len(response.json()) == 2


async def test_delete_collection(client):
    r = await client.post("/collections", json={"name": "Temp", "description": ""})
    coll_id = r.json()["id"]
    response = await client.delete(f"/collections/{coll_id}")
    assert response.status_code == 204
    assert (await client.get("/collections")).json() == []


async def test_delete_nonexistent_collection_returns_404(client):
    response = await client.delete("/collections/does-not-exist")
    assert response.status_code == 404
```

- [ ] **Step 2: Run to confirm failure**

```bash
pytest tests/api/test_collections.py -v
```

Expected: `5 failed` (routes return 404 or wrong status)

- [ ] **Step 3: Implement collections router**

`bookmark_context/api/collections.py`:
```python
from __future__ import annotations
from fastapi import APIRouter, Request, HTTPException
from starlette.responses import Response
from bookmark_context.api.schemas import CollectionCreate, CollectionResponse

router = APIRouter(prefix="/collections", tags=["collections"])


@router.get("", response_model=list[CollectionResponse])
def list_collections(request: Request):
    db = request.app.state.db
    collections = db.list_collections()
    result = []
    for c in collections:
        count = len(db.list_bookmarks(c["id"]))
        result.append(CollectionResponse(**c, bookmark_count=count))
    return result


@router.post("", response_model=CollectionResponse, status_code=201)
def create_collection(body: CollectionCreate, request: Request):
    db = request.app.state.db
    coll_id = db.create_collection(body.name, body.description)
    coll = db.get_collection(coll_id)
    return CollectionResponse(**coll, bookmark_count=0)


@router.delete("/{collection_id}", status_code=204)
def delete_collection(collection_id: str, request: Request):
    db = request.app.state.db
    if not db.get_collection(collection_id):
        raise HTTPException(status_code=404, detail="Collection not found")
    vs = request.app.state.vs
    db.delete_collection(collection_id)
    vs.delete_collection(collection_id)
    return Response(status_code=204)
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
pytest tests/api/test_collections.py -v
```

Expected: `5 passed`

- [ ] **Step 5: Commit**

```bash
git add bookmark_context/api/collections.py tests/api/test_collections.py
git commit -m "feat: collections REST API — list, create, delete"
```

---

## Task 13: Bookmarks API + /ask Endpoint

**Files:**
- Modify: `bookmark_context/api/bookmarks.py`
- Create: `tests/api/test_bookmarks.py`

- [ ] **Step 1: Write the failing tests**

`tests/api/test_bookmarks.py`:
```python
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock
from httpx import AsyncClient, ASGITransport
from bookmark_context.config import Config
from bookmark_context.api.app import create_app


@pytest.fixture
def config(tmp_path: Path):
    return Config(db_path=tmp_path / "test.db", chroma_path=tmp_path / "chroma")


@pytest.fixture
async def client(config):
    app = create_app(config)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


@pytest.fixture
async def collection_id(client):
    r = await client.post("/collections", json={"name": "Research", "description": ""})
    return r.json()["id"]


async def test_add_bookmark(client, collection_id):
    with patch("bookmark_context.api.bookmarks.IndexPipeline") as MockPipeline:
        MockPipeline.return_value.index_bookmark = MagicMock()
        response = await client.post(
            f"/collections/{collection_id}/bookmarks",
            json={"url": "https://example.com", "title": "Example"},
        )
    assert response.status_code == 201
    data = response.json()
    assert data["url"] == "https://example.com"
    assert data["index_status"] == "pending"


async def test_list_bookmarks(client, collection_id):
    with patch("bookmark_context.api.bookmarks.IndexPipeline"):
        await client.post(
            f"/collections/{collection_id}/bookmarks",
            json={"url": "https://example.com", "title": "Example"},
        )
    response = await client.get(f"/collections/{collection_id}/bookmarks")
    assert response.status_code == 200
    assert len(response.json()) == 1


async def test_delete_bookmark(client, collection_id):
    with patch("bookmark_context.api.bookmarks.IndexPipeline"):
        r = await client.post(
            f"/collections/{collection_id}/bookmarks",
            json={"url": "https://example.com", "title": "Example"},
        )
    bm_id = r.json()["id"]
    response = await client.delete(f"/bookmarks/{bm_id}")
    assert response.status_code == 204


async def test_ask_collection(client, collection_id):
    mock_result = {
        "answer": "Transformers use self-attention.",
        "sources": [{"url": "https://arxiv.org", "title": "Paper", "excerpt": "..."}],
    }
    with patch("bookmark_context.api.bookmarks.ask_collection", return_value=mock_result):
        with patch("bookmark_context.api.bookmarks._get_ai_adapter", return_value=MagicMock()):
            response = await client.post(
                f"/collections/{collection_id}/ask",
                json={"question": "What are transformers?"},
            )
    assert response.status_code == 200
    assert response.json()["answer"] == "Transformers use self-attention."


async def test_add_duplicate_bookmark_returns_existing(client, collection_id):
    with patch("bookmark_context.api.bookmarks.IndexPipeline"):
        r1 = await client.post(
            f"/collections/{collection_id}/bookmarks",
            json={"url": "https://example.com", "title": "Example"},
        )
        r2 = await client.post(
            f"/collections/{collection_id}/bookmarks",
            json={"url": "https://example.com", "title": "Example"},
        )
    assert r1.json()["id"] == r2.json()["id"]
```

- [ ] **Step 2: Run to confirm failure**

```bash
pytest tests/api/test_bookmarks.py -v
```

Expected: `5 failed`

- [ ] **Step 3: Implement bookmarks router**

`bookmark_context/api/bookmarks.py`:
```python
from __future__ import annotations
from fastapi import APIRouter, Request, HTTPException, BackgroundTasks
from starlette.responses import Response
from bookmark_context.api.schemas import BookmarkCreate, BookmarkResponse, AskRequest, AskResponse
from bookmark_context.indexer.pipeline import IndexPipeline
from bookmark_context.rag import ask_collection
from bookmark_context.config import Config
from bookmark_context.ai.base import AIAdapter

router = APIRouter(tags=["bookmarks"])


def _get_ai_adapter(config: Config) -> AIAdapter:
    if config.ai_backend == "ollama":
        from bookmark_context.ai.ollama import OllamaAdapter
        return OllamaAdapter(base_url=config.ollama_base_url, model=config.ollama_chat_model)
    from bookmark_context.ai.claude import ClaudeAdapter
    return ClaudeAdapter(api_key=config.claude_api_key, model=config.claude_chat_model)


@router.get("/collections/{collection_id}/bookmarks", response_model=list[BookmarkResponse])
def list_bookmarks(collection_id: str, request: Request):
    return request.app.state.db.list_bookmarks(collection_id)


@router.post("/collections/{collection_id}/bookmarks", response_model=BookmarkResponse, status_code=201)
def add_bookmark(collection_id: str, body: BookmarkCreate, request: Request, background_tasks: BackgroundTasks):
    db = request.app.state.db
    if not db.get_collection(collection_id):
        raise HTTPException(status_code=404, detail="Collection not found")
    bm_id = db.add_bookmark(collection_id, body.url, body.title or body.url)
    pipeline = IndexPipeline(db=db, vs=request.app.state.vs, embedder=request.app.state.embedder)
    background_tasks.add_task(pipeline.index_bookmark, bm_id, body.html)
    return db.get_bookmark(bm_id)


@router.delete("/bookmarks/{bookmark_id}", status_code=204)
def delete_bookmark(bookmark_id: str, request: Request):
    db = request.app.state.db
    bm = db.get_bookmark(bookmark_id)
    if not bm:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    request.app.state.vs.delete_bookmark_chunks(bm["collection_id"], bookmark_id)
    db.delete_bookmark(bookmark_id)
    return Response(status_code=204)


@router.post("/bookmarks/{bookmark_id}/reindex", response_model=BookmarkResponse)
def reindex_bookmark(bookmark_id: str, request: Request, background_tasks: BackgroundTasks):
    db = request.app.state.db
    bm = db.get_bookmark(bookmark_id)
    if not bm:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    pipeline = IndexPipeline(db=db, vs=request.app.state.vs, embedder=request.app.state.embedder)
    db.update_bookmark_status(bookmark_id, "pending")
    background_tasks.add_task(pipeline.index_bookmark, bookmark_id)
    return db.get_bookmark(bookmark_id)


@router.post("/collections/{collection_id}/ask", response_model=AskResponse)
def ask(collection_id: str, body: AskRequest, request: Request):
    config: Config = request.app.state.config
    result = ask_collection(
        collection_id=collection_id,
        question=body.question,
        embedder=request.app.state.embedder,
        vs=request.app.state.vs,
        ai=_get_ai_adapter(config),
    )
    return result
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
pytest tests/api/test_bookmarks.py -v
```

Expected: `5 passed`

- [ ] **Step 5: Run the full test suite**

```bash
pytest -v
```

Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add bookmark_context/api/bookmarks.py tests/api/test_bookmarks.py
git commit -m "feat: bookmarks REST API — list, add, delete, reindex, ask"
```

---

## Task 14: MCP Server

**Files:**
- Create: `bookmark_context/mcp/__init__.py`
- Create: `bookmark_context/mcp/server.py`
- Create: `tests/mcp/__init__.py`
- Create: `tests/mcp/test_server.py`

- [ ] **Step 1: Write the failing tests**

`tests/mcp/__init__.py`:
```python
```

`tests/mcp/test_server.py`:
```python
import pytest
from unittest.mock import MagicMock, patch
from bookmark_context.mcp.server import handle_list_collections, handle_search_collection, handle_ask_collection


def test_handle_list_collections():
    mock_db = MagicMock()
    mock_db.list_collections.return_value = [
        {"id": "col1", "name": "AI Research", "description": "Papers", "created_at": "2026-01-01", "updated_at": "2026-01-01"}
    ]
    mock_db.list_bookmarks.return_value = [{"id": "bm1"}, {"id": "bm2"}]

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
    assert result[0]["chunk"] == "relevant chunk"
    assert result[0]["score"] == 0.9


def test_handle_ask_collection():
    mock_embedder = MagicMock()
    mock_embedder.embed.return_value = [[0.1, 0.2, 0.3]]

    mock_vs = MagicMock()
    mock_vs.query.return_value = [
        {"text": "transformers use self-attention", "metadata": {"url": "https://arxiv.org", "title": "Paper"}, "score": 0.95}
    ]

    mock_ai = MagicMock()
    mock_ai.complete.return_value = "Transformers use self-attention layers."

    result = handle_ask_collection(
        collection_id="col1",
        question="What do transformers use?",
        embedder=mock_embedder,
        vs=mock_vs,
        ai=mock_ai,
    )
    assert result["answer"] == "Transformers use self-attention layers."
    assert len(result["sources"]) == 1
```

- [ ] **Step 2: Run to confirm failure**

```bash
pytest tests/mcp/test_server.py -v
```

Expected: `ImportError`

- [ ] **Step 3: Implement MCP server**

`bookmark_context/mcp/__init__.py`:
```python
```

`bookmark_context/mcp/server.py`:
```python
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

DAEMON_URL = "http://localhost:{port}/status"

mcp = FastMCP("bookmark-context")


def handle_list_collections(db: Database) -> list[dict]:
    collections = db.list_collections()
    return [
        {
            "id": c["id"],
            "name": c["name"],
            "description": c["description"],
            "bookmark_count": len(db.list_bookmarks(c["id"])),
            "last_indexed": c.get("updated_at", ""),
        }
        for c in collections
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
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
pytest tests/mcp/test_server.py -v
```

Expected: `3 passed`

- [ ] **Step 5: Commit**

```bash
git add bookmark_context/mcp/ tests/mcp/
git commit -m "feat: stdio MCP server with list, search, ask tools"
```

---

## Task 15: CLI Wiring + Full Test Suite

**Files:**
- Modify: `bookmark_context/cli.py`
- Create: `.gitignore`

- [ ] **Step 1: Implement the full CLI**

`bookmark_context/cli.py`:
```python
from __future__ import annotations
import sys


def main() -> None:
    if len(sys.argv) < 2 or sys.argv[1] not in ("serve", "mcp"):
        print("Usage: bookmark-context <serve|mcp>")
        sys.exit(1)

    command = sys.argv[1]

    if command == "serve":
        import uvicorn
        from bookmark_context.config import load_config
        from bookmark_context.api.app import create_app
        config = load_config()
        app = create_app(config)
        uvicorn.run(app, host="127.0.0.1", port=config.daemon_port)

    elif command == "mcp":
        from bookmark_context.mcp.server import run_mcp_server
        run_mcp_server()


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Create .gitignore**

`.gitignore`:
```
__pycache__/
*.pyc
*.pyo
.venv/
dist/
*.egg-info/
.pytest_cache/
.superpowers/
```

- [ ] **Step 3: Run the full test suite**

```bash
pytest -v
```

Expected: all tests pass. Record the count — it should be 34+ tests.

- [ ] **Step 4: Verify CLI works**

```bash
bookmark-context
```

Expected:
```
Usage: bookmark-context <serve|mcp>
```

- [ ] **Step 5: Final commit**

```bash
git add bookmark_context/cli.py .gitignore
git commit -m "feat: CLI wiring — bookmark-context serve | mcp"
```

---

## What's Next

Once this plan is complete, proceed to the Chrome extension plan:
`docs/superpowers/plans/2026-05-15-extension.md`

The extension connects to the daemon at `http://localhost:7331` — all endpoints are now available.
