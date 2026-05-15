# Bookmark Context — Design Spec

**Date:** 2026-05-15
**Status:** Approved

---

## Overview

Bookmark Context is a Chrome extension + local Python backend that lets you organise bookmarked pages into named collections, scrape and semantically index their content, and ask questions about any collection — both from within the extension and from Cursor via an MCP server.

---

## Architecture

Four components, all local. Nothing leaves the machine unless the Claude API backend is chosen.

```
Chrome Extension (MV3)
    ↕ HTTP (localhost:7331)
Local Daemon (Python FastAPI)
    ├── SQLite       — collections, bookmarks, chunks metadata
    └── ChromaDB     — embeddings
    ↕ (in-process or subprocess)
MCP Server (stdio)
    ↕ stdio
Cursor
```

### Key principle

The **daemon is the single source of truth**. The Chrome extension and MCP server are thin clients. Both ship from the same Python package (`bookmark-context`).

---

## Component 1: Chrome Extension (Manifest V3)

### Manifest permissions
- `contextMenus`, `sidePanel`, `activeTab`, `scripting`
- Host permission: `http://localhost:7331/*`

### Features

**Right-click context menu**
- "Add to collection →" submenu listing existing collections
- "New collection…" option at the bottom of the submenu
- Triggers: send current tab URL + rendered HTML to daemon

**Side panel (persistent UI)**
- Collections list with bookmark counts
- Search bar for filtering collections
- Current page card showing URL/title + "Add to collection" button
- Daemon status bar: running/offline indicator + active AI backend label
- Settings link (opens options page: daemon port, AI backend, API key)

**Content script**
- Captures rendered page HTML on demand (when user adds a page)
- Sends HTML to daemon so JS-rendered pages are scraped correctly without a headless browser on the server

**Indexing progress**
- Extension polls `GET /collections/{id}/bookmarks` to show per-bookmark `index_status`
- Shows spinner + chunk progress for `indexing` state
- Shows error + retry button for `error` state

---

## Component 2: Local Daemon (Python FastAPI)

### SQLite schema

```sql
collections  (id, name, description, created_at, updated_at)
bookmarks    (id, collection_id, url, title, favicon_url, added_at, indexed_at,
              index_status TEXT CHECK(index_status IN ('pending','indexing','done','error')),
              error_message)
chunks       (id, bookmark_id, content, chunk_index, chroma_id)
```

### REST API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/status` | Daemon health, AI backend info |
| GET | `/collections` | List all collections |
| POST | `/collections` | Create a collection |
| DELETE | `/collections/{id}` | Delete a collection and all its bookmarks |
| GET | `/collections/{id}/bookmarks` | List bookmarks + index status |
| POST | `/collections/{id}/bookmarks` | Add bookmark (triggers background indexing) |
| DELETE | `/bookmarks/{id}` | Remove a bookmark |
| POST | `/bookmarks/{id}/reindex` | Re-scrape and re-embed a bookmark |
| POST | `/collections/{id}/ask` | RAG query → answer + cited sources |

### Indexing pipeline

1. Receive URL + optional pre-rendered HTML from extension
2. If no HTML provided: fetch URL with `httpx` (handles most static pages)
3. Extract readable text with `trafilatura` (strips nav, ads, boilerplate)
4. Chunk into ~500-token segments with 50-token overlap
5. Embed each chunk via configured AI backend
6. Store vectors in ChromaDB under the collection's namespace
7. Store chunk records in SQLite; update `bookmarks.indexed_at` and `index_status=done`

Indexing runs as a background task (FastAPI `BackgroundTasks`). On failure: set `index_status=error` with the error message; retry with exponential backoff up to 3 attempts.

### AI backend (configurable)

Configured via `~/.config/bookmark-context/config.toml`:

```toml
[ai]
backend = "claude"   # or "ollama"

[claude]
api_key = "sk-..."
chat_model = "claude-sonnet-4-6"

[ollama]
base_url = "http://localhost:11434"
chat_model = "llama3"

[embedder]
model = "BAAI/bge-small-en-v1.5"   # local fastembed model, always used regardless of chat backend
```

**Embeddings are always local** using `fastembed` (wraps ONNX sentence-transformers, no server needed). This avoids the lack of an Anthropic embedding API and keeps indexing free and offline regardless of chat backend.

The `AIAdapter` interface covers only chat completion:
- `complete(system: str, user: str) -> str`

The `Embedder` is a single shared implementation:
- `embed(texts: list[str]) -> list[list[float]]` — uses `fastembed` with `BAAI/bge-small-en-v1.5` by default

### RAG query (`/collections/{id}/ask`)

1. Embed the question using the AI backend
2. Query ChromaDB for top-5 most similar chunks in the collection's namespace
3. Build a prompt: system instructions + retrieved chunks with source attribution + question
4. Call AI backend for completion
5. Return `{answer: str, sources: [{url, title, excerpt}]}`

---

## Component 3: MCP Server (stdio)

Ships in the same Python package. Entry point: `bookmark-context mcp`.

On startup: checks if daemon is running on port 7331. If not, starts it as a subprocess and waits for it to be healthy before serving MCP requests.

### Tools

**`list_collections()`**
- Returns all collections: `[{id, name, description, bookmark_count, last_indexed}]`

**`search_collection(collection_id: str, query: str, top_k: int = 5)`**
- Semantic search over a collection's chunks
- Returns: `[{chunk, url, title, score}]`

**`ask_collection(collection_id: str, question: str)`**
- Full RAG: retrieve → prompt → answer
- Returns: `{answer: str, sources: [{url, title, excerpt}]}`

### Cursor setup

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "bookmark-context": {
      "command": "bookmark-context",
      "args": ["mcp"]
    }
  }
}
```

---

## Project Structure

```
bookmark-context/
├── extension/               # Chrome MV3
│   ├── manifest.json
│   └── src/
│       ├── background/      # service worker, context menu
│       ├── sidepanel/       # vanilla JS side panel UI (no build step)
│       ├── content/         # content script (page HTML capture)
│       └── options/         # settings page
├── daemon/                  # Python package
│   ├── api/                 # FastAPI route handlers
│   ├── indexer/             # scrape, chunk, embed pipeline
│   ├── storage/             # SQLite + ChromaDB wrappers
│   ├── mcp/                 # stdio MCP server
│   ├── ai/                  # Claude + Ollama adapters
│   └── cli.py               # `bookmark-context serve | mcp` CLI
├── tests/
│   ├── api/
│   ├── indexer/
│   └── mcp/
├── pyproject.toml
└── docs/
```

---

## Error Handling

| Scenario | Behaviour |
|----------|-----------|
| Daemon not running | Extension shows "Daemon offline" with a Start button; MCP server auto-starts daemon |
| Scrape fails (blocked, 404, JS-only) | Bookmark saved with `index_status=error`; shown in extension with retry; still searchable via metadata |
| AI API key missing | Daemon returns error on `/status`; extension prompts to configure backend before indexing |
| Ollama not running | Same as above — detected at daemon startup |
| Embedding rate limit | Exponential backoff, up to 3 retries per chunk batch |
| Duplicate URL in collection | Return existing bookmark; do not re-index unless reindex is explicitly requested |

---

## Testing Strategy

| Layer | Approach |
|-------|----------|
| Daemon API | pytest + `httpx.AsyncClient` against in-memory SQLite; AI provider mocked |
| Indexing pipeline | Unit tests with fixture HTML files; embedding mocked with fixed vectors |
| MCP server | Integration test: spin up daemon + MCP server against test DB; call all three tools |
| Extension | Manual testing (load unpacked); no automation in v1 |

---

## Out of Scope (v1)

- Authenticated page scraping (stretch goal for v2 — extension already has the session)
- Full-text search across all collections simultaneously
- Sharing or exporting collections
- Desktop menu bar app / auto-start on login (can be added with a launchd plist)
- Browser support beyond Chrome
