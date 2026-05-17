# Collection Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add rename and delete controls to the side-panel extension, backed by a new `PATCH /collections/{id}` API endpoint.

**Architecture:** View-pages and remove-page are already implemented. This plan adds the missing PATCH endpoint + DB method, then wires up two new modal dialogs and a per-row ⋮ kebab menu in the extension. The extension's `selectedCollectionId` string is promoted to a full `_selectedCollection` object so dialogs can pre-fill name/description and show page counts.

**Tech Stack:** Python/FastAPI daemon (pytest), Chrome MV3 side panel (vanilla JS, no test framework — verify manually in browser).

---

## File Map

| File | Change |
|---|---|
| `bookmark_context/storage/database.py` | Add `update_collection()` method |
| `bookmark_context/api/schemas.py` | Add `CollectionUpdate` schema |
| `bookmark_context/api/collections.py` | Add `PATCH /{collection_id}` endpoint |
| `tests/storage/test_database.py` | Tests for `update_collection` |
| `tests/api/test_collections.py` | Tests for PATCH endpoint |
| `extension/shared/api.js` | Add `updateCollection()` helper |
| `extension/sidepanel/sidepanel.html` | Add two dialogs, header icon buttons, `#kebab-menu` div |
| `extension/sidepanel/sidepanel.css` | Add kebab, dropdown, icon button, danger button styles |
| `extension/sidepanel/sidepanel.js` | Promote state, add kebab menu, rename dialog, delete dialog |

---

## Task 1: DB — `update_collection` method

**Files:**
- Modify: `bookmark_context/storage/database.py:81-83`
- Test: `tests/storage/test_database.py`

- [ ] **Step 1: Write the failing tests**

Add to the end of `tests/storage/test_database.py`:

```python
def test_update_collection_changes_name_and_description(db: Database):
    coll_id = db.create_collection("Old Name", "old desc")
    db.update_collection(coll_id, "New Name", "new desc")
    coll = db.get_collection(coll_id)
    assert coll["name"] == "New Name"
    assert coll["description"] == "new desc"


def test_update_collection_changes_updated_at(db: Database):
    import time
    coll_id = db.create_collection("Name", "")
    before = db.get_collection(coll_id)["updated_at"]
    time.sleep(0.02)
    db.update_collection(coll_id, "Name", "")
    after = db.get_collection(coll_id)["updated_at"]
    assert after > before
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/bb/Sandbox/bookmark-context
python -m pytest tests/storage/test_database.py::test_update_collection_changes_name_and_description tests/storage/test_database.py::test_update_collection_changes_updated_at -v
```

Expected: FAIL with `AttributeError: 'Database' object has no attribute 'update_collection'`

- [ ] **Step 3: Implement `update_collection` in `database.py`**

Insert after `delete_collection` (after line 83):

```python
def update_collection(self, coll_id: str, name: str, description: str) -> None:
    with self._connect() as conn:
        conn.execute(
            "UPDATE collections SET name = ?, description = ?, updated_at = ? WHERE id = ?",
            (name, description, _now(), coll_id),
        )
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
python -m pytest tests/storage/test_database.py::test_update_collection_changes_name_and_description tests/storage/test_database.py::test_update_collection_changes_updated_at -v
```

Expected: PASS

- [ ] **Step 5: Run full test suite to confirm nothing regressed**

```bash
python -m pytest tests/ -q
```

Expected: all existing tests pass plus 2 new ones.

- [ ] **Step 6: Commit**

```bash
git add bookmark_context/storage/database.py tests/storage/test_database.py
git commit -m "feat: add update_collection DB method"
```

---

## Task 2: API — `PATCH /collections/{id}` endpoint

**Files:**
- Modify: `bookmark_context/api/schemas.py`
- Modify: `bookmark_context/api/collections.py`
- Test: `tests/api/test_collections.py`

- [ ] **Step 1: Write the failing tests**

Add to the end of `tests/api/test_collections.py`:

```python
async def test_rename_collection_returns_updated_fields(client):
    r = await client.post("/collections", json={"name": "Old", "description": "old"})
    coll_id = r.json()["id"]
    response = await client.patch(f"/collections/{coll_id}", json={"name": "New", "description": "new"})
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "New"
    assert data["description"] == "new"
    assert data["id"] == coll_id


async def test_rename_collection_returns_404_for_missing(client):
    response = await client.patch("/collections/does-not-exist", json={"name": "X"})
    assert response.status_code == 404


async def test_rename_collection_includes_bookmark_count(client):
    r = await client.post("/collections", json={"name": "Coll", "description": ""})
    coll_id = r.json()["id"]
    response = await client.patch(f"/collections/{coll_id}", json={"name": "Renamed"})
    assert response.status_code == 200
    assert response.json()["bookmark_count"] == 0
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
python -m pytest tests/api/test_collections.py::test_rename_collection_returns_updated_fields tests/api/test_collections.py::test_rename_collection_returns_404_for_missing tests/api/test_collections.py::test_rename_collection_includes_bookmark_count -v
```

Expected: FAIL with 405 Method Not Allowed (route doesn't exist yet).

- [ ] **Step 3: Add `CollectionUpdate` schema to `bookmark_context/api/schemas.py`**

Add after `CollectionCreate` (after line 8):

```python
class CollectionUpdate(BaseModel):
    name: str
    description: str = ""
```

- [ ] **Step 4: Add PATCH endpoint to `bookmark_context/api/collections.py`**

Replace the import line and add the new route. The full updated file:

```python
from __future__ import annotations
from fastapi import APIRouter, Request, HTTPException
from starlette.responses import Response
from bookmark_context.api.schemas import CollectionCreate, CollectionResponse, CollectionUpdate

router = APIRouter(prefix="/collections", tags=["collections"])


@router.get("", response_model=list[CollectionResponse])
def list_collections(request: Request):
    return [CollectionResponse(**c) for c in request.app.state.db.list_collections()]


@router.post("", response_model=CollectionResponse, status_code=201)
def create_collection(body: CollectionCreate, request: Request):
    db = request.app.state.db
    coll_id = db.create_collection(body.name, body.description)
    coll = db.get_collection(coll_id)
    return CollectionResponse(**coll, bookmark_count=0)


@router.patch("/{collection_id}", response_model=CollectionResponse)
def rename_collection(collection_id: str, body: CollectionUpdate, request: Request):
    db = request.app.state.db
    if not db.get_collection(collection_id):
        raise HTTPException(status_code=404, detail="Collection not found")
    db.update_collection(collection_id, body.name, body.description)
    coll = db.get_collection(collection_id)
    count = len(db.list_bookmarks(collection_id))
    return CollectionResponse(**coll, bookmark_count=count)


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

- [ ] **Step 5: Run tests to verify they pass**

```bash
python -m pytest tests/api/test_collections.py -v
```

Expected: all 8 tests pass (5 existing + 3 new).

- [ ] **Step 6: Run full test suite**

```bash
python -m pytest tests/ -q
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add bookmark_context/api/schemas.py bookmark_context/api/collections.py tests/api/test_collections.py
git commit -m "feat: add PATCH /collections/{id} rename endpoint"
```

---

## Task 3: Extension static assets — api.js, HTML, CSS

**Files:**
- Modify: `extension/shared/api.js`
- Modify: `extension/sidepanel/sidepanel.html`
- Modify: `extension/sidepanel/sidepanel.css`

- [ ] **Step 1: Add `updateCollection` to `extension/shared/api.js`**

Insert after `deleteCollection` (after line 27):

```js
  updateCollection: (id, name, description) =>
    request("PATCH", `/collections/${id}`, { name, description }),
```

The `api` export block should look like:

```js
export const api = {
  status: () => request("GET", "/status"),
  listCollections: () => request("GET", "/collections"),
  createCollection: (name, description = "") =>
    request("POST", "/collections", { name, description }),
  deleteCollection: (id) => request("DELETE", `/collections/${id}`),
  updateCollection: (id, name, description) =>
    request("PATCH", `/collections/${id}`, { name, description }),
  listBookmarks: (collectionId) =>
    request("GET", `/collections/${collectionId}/bookmarks`),
  addBookmark: (collectionId, url, title, html = null, force = false) =>
    request("POST", `/collections/${collectionId}/bookmarks${force ? "?force=true" : ""}`, { url, title, html }),
  deleteBookmark: (id) => request("DELETE", `/bookmarks/${id}`),
  reindexBookmark: (id) => request("POST", `/bookmarks/${id}/reindex`),
};
```

- [ ] **Step 2: Update `extension/sidepanel/sidepanel.html`**

**2a.** In the `#bookmarks-section` header, add ✎ and 🗑 buttons. Replace:

```html
    <div class="section-header">
      <button id="btn-back" class="btn-small">← Back</button>
      <span id="selected-collection-name" style="font-weight:600;flex:1;margin-left:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></span>
    </div>
```

With:

```html
    <div class="section-header">
      <button id="btn-back" class="btn-small">← Back</button>
      <span id="selected-collection-name" style="font-weight:600;flex:1;margin-left:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></span>
      <button id="btn-rename-collection" class="btn-icon" title="Rename collection">✎</button>
      <button id="btn-delete-collection" class="btn-icon btn-icon-danger" title="Delete collection">🗑</button>
    </div>
```

**2b.** Add the kebab menu container, rename dialog, and delete-collection dialog. Insert just before `<script type="module" src="sidepanel.js"></script>`:

```html
  <!-- Kebab dropdown menu -->
  <div id="kebab-menu" style="display:none"></div>

  <!-- Rename collection dialog -->
  <dialog id="rename-collection-dialog">
    <h3>Rename Collection</h3>
    <input type="text" id="rename-collection-name" placeholder="Name" autocomplete="off">
    <input type="text" id="rename-collection-desc" placeholder="Description (optional)" autocomplete="off">
    <div class="dialog-buttons">
      <button id="btn-update-collection" class="btn-primary">Update</button>
      <button id="btn-cancel-rename" class="btn-secondary">Cancel</button>
    </div>
  </dialog>

  <!-- Delete collection dialog -->
  <dialog id="delete-collection-dialog">
    <h3>Delete Collection</h3>
    <p id="delete-collection-message" style="font-size:12px;color:#94a3b8;margin:4px 0 12px"></p>
    <div class="dialog-buttons">
      <button id="btn-confirm-delete-collection" class="btn-danger">Delete</button>
      <button id="btn-cancel-delete-collection" class="btn-secondary">Cancel</button>
    </div>
  </dialog>
```

- [ ] **Step 3: Add new styles to `extension/sidepanel/sidepanel.css`**

Append at the end of the file:

```css
/* Header icon buttons (✎ 🗑 in bookmarks-section header) */
.btn-icon {
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  font-size: 14px;
  padding: 2px 5px;
  border-radius: 4px;
  flex-shrink: 0;
}
.btn-icon:hover { background: rgba(255,255,255,0.08); color: #e2e8f0; }
.btn-icon-danger:hover { color: #ef4444; }

/* ⋮ kebab button on collection rows */
.btn-kebab {
  background: none;
  border: none;
  color: #475569;
  cursor: pointer;
  font-size: 15px;
  padding: 0 4px;
  line-height: 1;
  border-radius: 4px;
  flex-shrink: 0;
}
.btn-kebab:hover { background: rgba(99,102,241,0.2); color: #a5b4fc; }

/* Floating kebab dropdown */
#kebab-menu {
  position: fixed;
  background: #1e2235;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 6px;
  padding: 4px;
  z-index: 100;
  min-width: 120px;
  box-shadow: 0 4px 16px rgba(0,0,0,.5);
}
.menu-item {
  padding: 6px 10px;
  cursor: pointer;
  border-radius: 4px;
  color: #e2e8f0;
  font-size: 12px;
}
.menu-item:hover { background: rgba(255,255,255,0.08); }
.menu-item-danger { color: #ef4444; }
.menu-item-danger:hover { background: rgba(239,68,68,0.12); }

/* Danger button for delete-collection dialog */
.btn-danger {
  background: #dc2626;
  border: none;
  color: white;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  flex: 1;
  margin-bottom: 0;
}
.btn-danger:hover { background: #b91c1c; }
```

- [ ] **Step 4: Commit**

```bash
git add extension/shared/api.js extension/sidepanel/sidepanel.html extension/sidepanel/sidepanel.css
git commit -m "feat: add updateCollection api helper, rename/delete dialogs, kebab menu HTML+CSS"
```

---

## Task 4: JS — state promotion + kebab menu

**Files:**
- Modify: `extension/sidepanel/sidepanel.js`

This task promotes `selectedCollectionId` (string) to `_selectedCollection` (full collection object), adds ⋮ button to each collection row, and wires up the kebab dropdown.

- [ ] **Step 1: Promote `selectedCollectionId` to `_selectedCollection`**

In `sidepanel.js`, make these changes:

**Line 171** — change variable declaration:
```js
// Before:
let selectedCollectionId = null;

// After:
let _selectedCollection = null;
```

**Lines 173-182** — update the collections-list click handler:
```js
// Before:
$("collections-list").addEventListener("click", async (e) => {
  const item = e.target.closest(".collection-item");
  if (!item) return;
  selectedCollectionId = item.dataset.id;
  const coll = collections.find((c) => c.id === selectedCollectionId);
  $("selected-collection-name").textContent = coll?.name || "";
  await renderBookmarks();
  $("collections-section").style.display = "none";
  $("bookmarks-section").style.display = "";
});

// After:
$("collections-list").addEventListener("click", async (e) => {
  if (e.target.closest(".btn-kebab")) return;
  const item = e.target.closest(".collection-item");
  if (!item) return;
  _selectedCollection = collections.find((c) => c.id === item.dataset.id) || null;
  $("selected-collection-name").textContent = _selectedCollection?.name || "";
  await renderBookmarks();
  $("collections-section").style.display = "none";
  $("bookmarks-section").style.display = "";
});
```

**Lines 184-189** — update btn-back handler:
```js
// Before:
$("btn-back").addEventListener("click", () => {
  selectedCollectionId = null;
  $("bookmarks-section").style.display = "none";
  $("collections-section").style.display = "";
  loadCollections();
});

// After:
$("btn-back").addEventListener("click", () => {
  _selectedCollection = null;
  $("bookmarks-section").style.display = "none";
  $("collections-section").style.display = "";
  loadCollections();
});
```

**Lines 191-210** — update `renderBookmarks()`:
```js
// Before:
async function renderBookmarks() {
  if (!selectedCollectionId) return;
  const bookmarks = await api.listBookmarks(selectedCollectionId);

// After:
async function renderBookmarks() {
  if (!_selectedCollection) return;
  const bookmarks = await api.listBookmarks(_selectedCollection.id);
```

**Lines 231-235** — update setInterval:
```js
// Before:
  if (selectedCollectionId && $("bookmarks-section").style.display !== "none") {

// After:
  if (_selectedCollection && $("bookmarks-section").style.display !== "none") {
```

- [ ] **Step 2: Add ⋮ button to `renderCollections()`**

Replace the `renderCollections` function (lines 32-46):

```js
function renderCollections(filter = "") {
  const list = $("collections-list");
  const lower = filter.toLowerCase();
  const visible = filter
    ? collections.filter((c) => c.name.toLowerCase().includes(lower))
    : collections;
  list.innerHTML = visible
    .map(
      (c) => `<li class="collection-item" data-id="${c.id}">
        <span class="collection-name">🗂 ${escHtml(c.name)}</span>
        <span class="collection-count">${c.bookmark_count} pages</span>
        <button class="btn-kebab" data-id="${c.id}" title="Options">⋮</button>
      </li>`
    )
    .join("");
}
```

- [ ] **Step 3: Add kebab menu event listener and functions**

Add after the `$("collections-list").addEventListener("click", ...)` navigation handler (after line ~189 in the updated file):

```js
$("collections-list").addEventListener("click", (e) => {
  const btn = e.target.closest(".btn-kebab");
  if (!btn) return;
  const coll = collections.find((c) => c.id === btn.dataset.id);
  if (coll) openKebabMenu(btn, coll);
});

function openKebabMenu(anchor, collection) {
  const menu = $("kebab-menu");
  menu.innerHTML = `
    <div class="menu-item" data-action="rename">✎ Rename</div>
    <div class="menu-item menu-item-danger" data-action="delete">🗑 Delete</div>
  `;
  const rect = anchor.getBoundingClientRect();
  menu.style.top = (rect.bottom + 4) + "px";
  menu.style.right = (document.documentElement.clientWidth - rect.right) + "px";
  menu.style.display = "block";
  menu.querySelector("[data-action='rename']").onclick = () => {
    closeKebabMenu();
    openRenameDialog(collection);
  };
  menu.querySelector("[data-action='delete']").onclick = () => {
    closeKebabMenu();
    openDeleteCollectionDialog(collection);
  };
}

function closeKebabMenu() {
  $("kebab-menu").style.display = "none";
}

document.addEventListener("click", (e) => {
  if (!e.target.closest("#kebab-menu") && !e.target.closest(".btn-kebab")) {
    closeKebabMenu();
  }
});
```

- [ ] **Step 4: Verify in browser**

Load the extension in Chrome (`chrome://extensions` → Load unpacked → select `/Users/bb/Sandbox/bookmark-context/extension`). Open the side panel. Verify:
- Each collection row shows a ⋮ button on the right
- Clicking a collection name navigates into it (no regression)
- Clicking ⋮ opens a dropdown with "✎ Rename" and "🗑 Delete"
- Clicking elsewhere closes the dropdown
- Back button returns to collections list

- [ ] **Step 5: Commit**

```bash
git add extension/sidepanel/sidepanel.js
git commit -m "feat: promote selectedCollectionId to full object, add kebab menu per collection row"
```

---

## Task 5: JS — rename dialog logic

**Files:**
- Modify: `extension/sidepanel/sidepanel.js`

- [ ] **Step 1: Add `openRenameDialog` and handlers**

After the `closeKebabMenu` block (after the `document.addEventListener("click", ...)` for kebab), add:

```js
// --- Rename collection dialog ---
let _renamingCollection = null;

function openRenameDialog(collection) {
  _renamingCollection = collection;
  $("rename-collection-name").value = collection.name;
  $("rename-collection-desc").value = collection.description || "";
  $("rename-collection-dialog").showModal();
  $("rename-collection-name").focus();
  $("rename-collection-name").select();
}

$("btn-update-collection").addEventListener("click", async () => {
  const name = $("rename-collection-name").value.trim();
  if (!name || !_renamingCollection) return;
  const updatedId = _renamingCollection.id;
  try {
    await api.updateCollection(
      updatedId,
      name,
      $("rename-collection-desc").value.trim(),
    );
    $("rename-collection-dialog").close();
    _renamingCollection = null;
    await loadCollections();
    if (_selectedCollection?.id === updatedId) {
      _selectedCollection.name = name;
      $("selected-collection-name").textContent = name;
    }
  } catch (e) {
    alert(`Failed to rename: ${e.message}`);
  }
});

$("btn-cancel-rename").addEventListener("click", () => {
  $("rename-collection-dialog").close();
  _renamingCollection = null;
});

$("btn-rename-collection").addEventListener("click", () => {
  if (_selectedCollection) openRenameDialog(_selectedCollection);
});
```

- [ ] **Step 2: Verify in browser**

Open the side panel. Test both access points:

**From the collections list (⋮ menu):**
- Click ⋮ on any collection → click "✎ Rename"
- Dialog opens pre-filled with the collection's current name and description
- Change the name → click "Update"
- Dialog closes, collection list refreshes with the new name

**From inside a collection (header ✎ button):**
- Open a collection → click ✎ in the header
- Dialog opens pre-filled
- Change name → click "Update"
- Header name updates live; list also refreshes when returning

**Cancel path:**
- Open rename dialog → click "Cancel" → dialog closes, nothing changes

- [ ] **Step 3: Commit**

```bash
git add extension/sidepanel/sidepanel.js
git commit -m "feat: add rename collection dialog with Update button"
```

---

## Task 6: JS — delete collection dialog logic

**Files:**
- Modify: `extension/sidepanel/sidepanel.js`

- [ ] **Step 1: Add `openDeleteCollectionDialog` and handlers**

After the rename dialog block, add:

```js
// --- Delete collection dialog ---
let _deletingCollection = null;

function openDeleteCollectionDialog(collection) {
  _deletingCollection = collection;
  $("delete-collection-message").innerHTML =
    `Delete <strong>${escHtml(collection.name)}</strong>?<br>` +
    `<span style="color:#f87171">This will permanently remove ${collection.bookmark_count} saved page(s).</span>`;
  $("delete-collection-dialog").showModal();
}

$("btn-confirm-delete-collection").addEventListener("click", async () => {
  if (!_deletingCollection) return;
  const deletedId = _deletingCollection.id;
  try {
    await api.deleteCollection(deletedId);
    $("delete-collection-dialog").close();
    _deletingCollection = null;
    if (_selectedCollection?.id === deletedId) {
      _selectedCollection = null;
      $("bookmarks-section").style.display = "none";
      $("collections-section").style.display = "";
    }
    await loadCollections();
  } catch (e) {
    alert(`Failed to delete collection: ${e.message}`);
  }
});

$("btn-cancel-delete-collection").addEventListener("click", () => {
  $("delete-collection-dialog").close();
  _deletingCollection = null;
});

$("btn-delete-collection").addEventListener("click", () => {
  if (_selectedCollection) openDeleteCollectionDialog(_selectedCollection);
});
```

- [ ] **Step 2: Verify in browser**

**From the collections list (⋮ menu):**
- Click ⋮ on a collection → click "🗑 Delete"
- Dialog shows collection name and page count
- Click "Cancel" → dialog closes, nothing deleted
- Click "Delete" → collection disappears from list

**From inside a collection (header 🗑 button):**
- Open a collection → click 🗑 in the header
- Dialog shows the name + count
- Click "Delete" → returns to collections list, collection is gone

**Edge case — delete the currently-viewed collection:**
- While inside a collection, click 🗑 → confirm Delete
- Extension navigates back to the collections list automatically

- [ ] **Step 3: Run the full Python test suite one final time**

```bash
cd /Users/bb/Sandbox/bookmark-context
python -m pytest tests/ -q
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add extension/sidepanel/sidepanel.js
git commit -m "feat: add delete collection confirmation dialog"
```
