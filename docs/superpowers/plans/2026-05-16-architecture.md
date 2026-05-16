# Architecture Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix five structural issues: chunk size silently exceeding the embedding model's token limit, no pagination on the bookmark list, storage paths not configurable via `config.toml`, unbounded concurrent index jobs potentially starving the HTTP server, and the scan gate causing trafilatura to parse every clean page's HTML twice (once for scan, once in the pipeline).

**Architecture:** Chunker default drops from 500 to 350 words (stays under the 512-token model limit). `list_bookmarks` gains `limit`/`offset` query params in DB, API, and extension UI. `load_config` learns to read `db_path` and `chroma_path` from TOML. A module-level `asyncio.Semaphore(3)` in `bookmarks.py` caps concurrent index tasks. The pipeline gains an optional `text: str | None` parameter so the scan gate can pass pre-extracted text instead of re-scraping.

**Tech Stack:** Python stdlib `asyncio`, existing FastAPI/pytest/httpx stack, vanilla JS

---

## File Map

- Modify: `bookmark_context/indexer/chunker.py` — default `chunk_size` 500 → 350
- Modify: `bookmark_context/storage/database.py` — `list_bookmarks` gains `limit`/`offset`
- Modify: `bookmark_context/api/bookmarks.py` — expose pagination params, add semaphore, pass pre-extracted text to pipeline
- Modify: `bookmark_context/config.py` — parse `db_path`/`chroma_path` from TOML
- Modify: `extension/shared/api.js` — pass pagination params to `listBookmarks`
- Modify: `extension/sidepanel/sidepanel.js` — paginated bookmark list with Load More button
- Test: `tests/indexer/test_chunker.py` — verify default fits model limit
- Test: `tests/storage/test_database.py` — pagination tests
- Test: `tests/api/test_bookmarks.py` — pagination API tests
- Test: `tests/test_config.py` — path parsing tests

---

### Task 1: Fix chunk size default

**Files:**
- Modify: `bookmark_context/indexer/chunker.py`
- Test: `tests/indexer/test_chunker.py`

- [ ] **Step 1: Write failing test**

Append to `tests/indexer/test_chunker.py`:
```python
def test_default_chunk_fits_bge_small_token_limit():
    # BAAI/bge-small-en-v1.5 has 512-token max (~395 words at 1.3 tokens/word).
    # Default chunk_size must keep every chunk under that limit.
    from bookmark_context.indexer.chunker import chunk_text
    import inspect
    sig = inspect.signature(chunk_text)
    default_size = sig.parameters["chunk_size"].default
    assert default_size <= 350, (
        f"Default chunk_size={default_size} likely exceeds 512-token model limit "
        "(500 words ≈ 650 tokens). Set to ≤350."
    )
```

- [ ] **Step 2: Run to verify failure**

```
venv/bin/pytest tests/indexer/test_chunker.py::test_default_chunk_fits_bge_small_token_limit -v
```
Expected: FAIL — `AssertionError: Default chunk_size=500 likely exceeds...`

- [ ] **Step 3: Update `bookmark_context/indexer/chunker.py`**

```python
from __future__ import annotations


def chunk_text(text: str, chunk_size: int = 350, overlap: int = 50) -> list[str]:
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

- [ ] **Step 4: Run all chunker tests**

```
venv/bin/pytest tests/indexer/test_chunker.py -v
```
Expected: all pass. Note: `test_long_text_splits_into_multiple_chunks` uses 600 words which still splits at 350, so it still produces `> 1` chunk.

- [ ] **Step 5: Commit**

```bash
git add bookmark_context/indexer/chunker.py tests/indexer/test_chunker.py
git commit -m "fix: reduce default chunk_size to 350 words to stay within 512-token model limit"
```

---

### Task 2: Paginate `list_bookmarks` in the DB layer

**Files:**
- Modify: `bookmark_context/storage/database.py`
- Test: `tests/storage/test_database.py`

- [ ] **Step 1: Write failing tests**

Append to `tests/storage/test_database.py`:
```python
def test_list_bookmarks_limit(db: Database):
    coll_id = db.create_collection("Research", "")
    for i in range(5):
        db.add_bookmark(coll_id, f"https://example.com/{i}", f"Page {i}")
    result = db.list_bookmarks(coll_id, limit=3)
    assert len(result) == 3


def test_list_bookmarks_offset(db: Database):
    coll_id = db.create_collection("Research", "")
    for i in range(5):
        db.add_bookmark(coll_id, f"https://example.com/{i}", f"Page {i}")
    all_bms = db.list_bookmarks(coll_id)
    page2 = db.list_bookmarks(coll_id, limit=3, offset=3)
    assert len(page2) == 2
    assert page2[0]["id"] == all_bms[3]["id"]


def test_list_bookmarks_no_limit_returns_all(db: Database):
    coll_id = db.create_collection("Research", "")
    for i in range(5):
        db.add_bookmark(coll_id, f"https://example.com/{i}", f"Page {i}")
    result = db.list_bookmarks(coll_id)
    assert len(result) == 5
```

- [ ] **Step 2: Run to verify failure**

```
venv/bin/pytest tests/storage/test_database.py -v -k "limit or offset"
```
Expected: `TypeError: list_bookmarks() got an unexpected keyword argument 'limit'`

- [ ] **Step 3: Update `list_bookmarks` in `bookmark_context/storage/database.py`**

Replace the `list_bookmarks` method:
```python
    def list_bookmarks(
        self, collection_id: str, limit: int | None = None, offset: int = 0
    ) -> list[dict]:
        with self._connect() as conn:
            if limit is not None:
                rows = conn.execute(
                    "SELECT * FROM bookmarks WHERE collection_id = ? ORDER BY added_at DESC LIMIT ? OFFSET ?",
                    (collection_id, limit, offset),
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM bookmarks WHERE collection_id = ? ORDER BY added_at DESC",
                    (collection_id,),
                ).fetchall()
        return [dict(r) for r in rows]
```

- [ ] **Step 4: Run all DB tests**

```
venv/bin/pytest tests/storage/test_database.py -v
```
Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add bookmark_context/storage/database.py tests/storage/test_database.py
git commit -m "feat: add limit/offset pagination to list_bookmarks"
```

---

### Task 3: Expose pagination in the API and add indexing semaphore

> **⚠ Note (added after scanner implementation):** This task was written before the injection scanner was added to `bookmarks.py`. The rewrite in Step 3 below does NOT include the scan gate or `force` query parameter. Before applying that rewrite, read the current `bookmark_context/api/bookmarks.py` and merge the scan gate logic (`if not force: scrape + scan + return ScanWarning`) and the `force: bool = Query(default=False)` parameter into the new version. The scan gate must be preserved; the semaphore wraps only the pipeline call, not the scan.

**Files:**
- Modify: `bookmark_context/api/bookmarks.py`
- Test: `tests/api/test_bookmarks.py`

- [ ] **Step 1: Write failing test**

Append to `tests/api/test_bookmarks.py`:
```python
async def test_list_bookmarks_limit_param(client, collection_id):
    with patch("bookmark_context.api.bookmarks.IndexPipeline"):
        for i in range(4):
            await client.post(
                f"/collections/{collection_id}/bookmarks",
                json={"url": f"https://example.com/{i}", "title": f"Page {i}"},
            )
    response = await client.get(
        f"/collections/{collection_id}/bookmarks", params={"limit": 2}
    )
    assert response.status_code == 200
    assert len(response.json()) == 2


async def test_list_bookmarks_offset_param(client, collection_id):
    with patch("bookmark_context.api.bookmarks.IndexPipeline"):
        for i in range(4):
            await client.post(
                f"/collections/{collection_id}/bookmarks",
                json={"url": f"https://example.com/{i}", "title": f"Page {i}"},
            )
    all_bms = (await client.get(f"/collections/{collection_id}/bookmarks")).json()
    page2 = (
        await client.get(
            f"/collections/{collection_id}/bookmarks", params={"limit": 2, "offset": 2}
        )
    ).json()
    assert len(page2) == 2
    assert page2[0]["id"] == all_bms[2]["id"]
```

- [ ] **Step 2: Run to verify failure**

```
venv/bin/pytest tests/api/test_bookmarks.py -v -k "limit_param or offset_param"
```
Expected: FAIL — route ignores `limit` and returns all 4 bookmarks

- [ ] **Step 3: Rewrite `bookmark_context/api/bookmarks.py`**

```python
from __future__ import annotations
import asyncio
from fastapi import APIRouter, Request, HTTPException, BackgroundTasks, Query
from starlette.responses import Response
from bookmark_context.api.schemas import BookmarkCreate, BookmarkResponse
from bookmark_context.indexer.pipeline import IndexPipeline

router = APIRouter(tags=["bookmarks"])

_INDEX_SEM = asyncio.Semaphore(3)


async def _run_index(pipeline: IndexPipeline, bm_id: str, html: str | None) -> None:
    async with _INDEX_SEM:
        await asyncio.to_thread(pipeline.index_bookmark, bm_id, html)


@router.get("/collections/{collection_id}/bookmarks", response_model=list[BookmarkResponse])
def list_bookmarks(
    collection_id: str,
    request: Request,
    limit: int | None = Query(default=None, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
):
    return request.app.state.db.list_bookmarks(collection_id, limit=limit, offset=offset)


@router.post("/collections/{collection_id}/bookmarks", response_model=BookmarkResponse, status_code=201)
def add_bookmark(
    collection_id: str, body: BookmarkCreate, request: Request, background_tasks: BackgroundTasks
):
    db = request.app.state.db
    if not db.get_collection(collection_id):
        raise HTTPException(status_code=404, detail="Collection not found")
    bm_id = db.add_bookmark(collection_id, body.url, body.title or body.url)
    pipeline = IndexPipeline(db=db, vs=request.app.state.vs, embedder=request.app.state.embedder)
    background_tasks.add_task(_run_index, pipeline, bm_id, body.html)
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
    if bm["index_status"] == "indexing":
        return bm
    pipeline = IndexPipeline(db=db, vs=request.app.state.vs, embedder=request.app.state.embedder)
    db.update_bookmark_status(bookmark_id, "pending")
    background_tasks.add_task(_run_index, pipeline, bookmark_id, None)
    return db.get_bookmark(bookmark_id)
```

Note: `_run_index` is async and uses `asyncio.to_thread` so embedding runs in a thread pool without blocking the event loop. The `Semaphore(3)` limits concurrency to 3 simultaneous index jobs.

- [ ] **Step 4: Run all bookmark tests**

```
venv/bin/pytest tests/api/test_bookmarks.py -v
```
Expected: all pass

- [ ] **Step 5: Run full suite**

```
venv/bin/pytest -q
```
Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add bookmark_context/api/bookmarks.py tests/api/test_bookmarks.py
git commit -m "feat: paginate list_bookmarks API, cap concurrent index jobs with semaphore"
```

---

### Task 4: Config reads storage paths from TOML

**Files:**
- Modify: `bookmark_context/config.py`
- Test: `tests/test_config.py`

- [ ] **Step 1: Write failing test**

Append to `tests/test_config.py`:
```python
def test_load_config_custom_paths(tmp_path: Path):
    db_path = tmp_path / "custom" / "bookmarks.db"
    chroma_path = tmp_path / "custom" / "chroma"
    toml_content = f"""
[storage]
db_path = "{db_path}"
chroma_path = "{chroma_path}"
"""
    config_file = tmp_path / "config.toml"
    config_file.write_text(toml_content)
    config = load_config(config_path=config_file)
    assert config.db_path == db_path
    assert config.chroma_path == chroma_path
```

- [ ] **Step 2: Run to verify failure**

```
venv/bin/pytest tests/test_config.py::test_load_config_custom_paths -v
```
Expected: FAIL — custom paths not read, config still has default paths

- [ ] **Step 3: Update `load_config` in `bookmark_context/config.py`**

```python
def load_config(config_path: Path = DEFAULT_CONFIG_PATH) -> Config:
    if not config_path.exists():
        return Config()
    with open(config_path, "rb") as f:
        data = tomllib.load(f)
    cfg = Config()
    if "daemon" in data:
        cfg.daemon_port = data["daemon"].get("port", cfg.daemon_port)
    if "embedder" in data:
        cfg.embed_model = data["embedder"].get("model", cfg.embed_model)
    if "storage" in data:
        if "db_path" in data["storage"]:
            cfg.db_path = Path(data["storage"]["db_path"])
        if "chroma_path" in data["storage"]:
            cfg.chroma_path = Path(data["storage"]["chroma_path"])
    return cfg
```

- [ ] **Step 4: Run all config tests**

```
venv/bin/pytest tests/test_config.py -v
```
Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add bookmark_context/config.py tests/test_config.py
git commit -m "feat: support db_path and chroma_path in config.toml [storage] section"
```

---

### Task 5: Extension pagination UI

**Files:**
- Modify: `extension/shared/api.js`
- Modify: `extension/sidepanel/sidepanel.js`

Manual verification only.

- [ ] **Step 1: Update `listBookmarks` in `extension/shared/api.js`**

Replace the `listBookmarks` line:
```js
  listBookmarks: (collectionId, limit = 100, offset = 0) =>
    request("GET", `/collections/${collectionId}/bookmarks?limit=${limit}&offset=${offset}`),
```

- [ ] **Step 2: Add pagination state and Load More button to `extension/sidepanel/sidepanel.js`**

Add these constants near the top of the file (after the `$` helper):
```js
const PAGE_SIZE = 50;
let bookmarkOffset = 0;
let allBookmarksLoaded = false;
```

Replace the `renderBookmarks` function:
```js
async function renderBookmarks(reset = true) {
  if (!selectedCollectionId) return;

  if (reset) {
    bookmarkOffset = 0;
    allBookmarksLoaded = false;
    $("bookmarks-list").innerHTML = "";
  }

  const bookmarks = await api.listBookmarks(selectedCollectionId, PAGE_SIZE, bookmarkOffset);
  const list = $("bookmarks-list");

  if (reset && !bookmarks.length) {
    list.innerHTML =
      '<li style="padding:12px 8px;color:#64748b;font-size:12px">No bookmarks yet. Add pages using the right-click menu or the panel below.</li>';
    return;
  }

  const items = bookmarks
    .map(
      (b) => `
    <li class="bookmark-item" data-id="${b.id}">
      <div class="bookmark-item-title">${escHtml(b.title || b.url)}</div>
      <div class="bookmark-item-url">${escHtml(b.url)}</div>
      <span class="bookmark-status status-${b.index_status}">${statusLabel(b.index_status)}</span>
      <div class="bookmark-actions">
        <button class="btn-xs" data-action="reindex" data-id="${b.id}">↻ Re-index</button>
        <button class="btn-xs danger" data-action="delete" data-id="${b.id}">✕ Remove</button>
      </div>
    </li>`
    )
    .join("");

  // Remove previous "load more" button if present before appending new items
  const existing = list.querySelector("[data-load-more]");
  if (existing) existing.remove();

  list.insertAdjacentHTML("beforeend", items);

  if (bookmarks.length === PAGE_SIZE) {
    list.insertAdjacentHTML(
      "beforeend",
      `<li data-load-more style="padding:8px;text-align:center">
        <button class="btn-xs" id="btn-load-more">Load more…</button>
      </li>`
    );
    $("btn-load-more").addEventListener("click", async () => {
      bookmarkOffset += PAGE_SIZE;
      await renderBookmarks(false);
    });
  }
}
```

- [ ] **Step 3: Manual verification**

1. Add more than 50 bookmarks to a collection (or lower `PAGE_SIZE` to 3 for testing)
2. Open the collection — first 50 appear, a "Load more…" button shows at the bottom
3. Click "Load more…" — next batch appends without replacing the list
4. When fewer than `PAGE_SIZE` items are returned, no button appears

- [ ] **Step 4: Commit**

```bash
git add extension/shared/api.js extension/sidepanel/sidepanel.js
git commit -m "feat: paginate bookmark list in side panel with Load More button (50 per page)"
```

---

### Task 6: Eliminate double-scraping on clean path

**Files:**
- Modify: `bookmark_context/indexer/pipeline.py`
- Modify: `bookmark_context/api/bookmarks.py`
- Test: `tests/indexer/test_pipeline.py`

**Context:** When a user adds a clean page, `add_bookmark` calls `scrape_url(url, html=html)` for the scan gate, confirms it's clean, then queues `pipeline.index_bookmark(bm_id, html)`. The pipeline calls `scrape_url` again with the same HTML. Trafilatura parses the same string twice. No network cost (HTML was captured by the extension), but it's wasteful. Fix: add `text: str | None = None` to `IndexPipeline.index_bookmark` so the scan gate can pass the already-extracted text.

- [ ] **Step 1: Write failing test**

Append to `tests/indexer/test_pipeline.py`:
```python
def test_index_bookmark_uses_preextracted_text(db, vs, mock_embedder):
    coll_id = db.create_collection("Test", "")
    bm_id = db.add_bookmark(coll_id, "https://example.com", "Example")

    with patch("bookmark_context.indexer.pipeline.scrape_url") as mock_scrape:
        pipeline = IndexPipeline(db=db, vs=vs, embedder=mock_embedder)
        pipeline.index_bookmark(bm_id, text="Pre-extracted article content here")

    mock_scrape.assert_not_called()
    bm = db.get_bookmark(bm_id)
    assert bm["index_status"] == "done"
```

- [ ] **Step 2: Run to verify failure**

```
venv/bin/pytest tests/indexer/test_pipeline.py::test_index_bookmark_uses_preextracted_text -v
```
Expected: FAIL — `scrape_url` is called even when text is provided

- [ ] **Step 3: Add `text` param to `IndexPipeline.index_bookmark`**

In `bookmark_context/indexer/pipeline.py`, update the method signature and skip scraping when `text` is provided:

```python
    def index_bookmark(
        self, bookmark_id: str, html: str | None = None, text: str | None = None
    ) -> None:
        bm = self.db.get_bookmark(bookmark_id)
        if not bm:
            return

        self.db.update_bookmark_status(bookmark_id, "indexing")
        try:
            if text is None:
                text = scrape_url(bm["url"], html=html)
            if not text:
                self.db.update_bookmark_status(bookmark_id, "error", "No content extracted from page")
                return

            chunks = chunk_text(text)
            scan_results = scan_chunks(chunks)
            embeddings = self.embedder.embed(chunks)
            # ... rest unchanged
```

- [ ] **Step 4: Pass pre-extracted text from `add_bookmark` in `bookmark_context/api/bookmarks.py`**

In the scan gate block, after confirming the page is clean, pass `text` to the background task:

```python
    if not force:
        text = scrape_url(body.url, html=body.html)
        if text:
            chunks = chunk_text(text)
            results = scan_chunks(chunks)
            risky = [r for r in results if r.risk_score > 0]
            if risky:
                # ... return ScanWarning (unchanged)
            # Clean — pass extracted text to pipeline to avoid re-scraping
            bm_id = db.add_bookmark(collection_id, body.url, body.title or body.url)
            pipeline = IndexPipeline(db=db, vs=request.app.state.vs, embedder=request.app.state.embedder)
            background_tasks.add_task(pipeline.index_bookmark, bm_id, body.html, text)
            bm = db.get_bookmark(bm_id)
            return JSONResponse(status_code=201, content=BookmarkResponse(**bm).model_dump())

    # force=True or scrape returned empty — fall through to normal save
    bm_id = db.add_bookmark(collection_id, body.url, body.title or body.url)
    pipeline = IndexPipeline(db=db, vs=request.app.state.vs, embedder=request.app.state.embedder)
    background_tasks.add_task(pipeline.index_bookmark, bm_id, body.html)
    bm = db.get_bookmark(bm_id)
    return JSONResponse(status_code=201, content=BookmarkResponse(**bm).model_dump())
```

- [ ] **Step 5: Run full suite**

```
venv/bin/pytest -q
```
Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add bookmark_context/indexer/pipeline.py bookmark_context/api/bookmarks.py \
        tests/indexer/test_pipeline.py
git commit -m "perf: pass pre-extracted text to pipeline to avoid double-scraping on clean path"
```
