# Collection Management Features Design

## Overview

Add four collection management capabilities to the side panel extension: view pages in a collection, remove a page from a collection, rename a collection, and delete a collection.

---

## Confirmed Design Decisions

- **Controls placement:** Combined B+C — ⋮ kebab menu per row in the collections list (manage without entering) + ✎ / 🗑 icon buttons in the bookmarks-view header (manage while browsing pages).
- **Rename interaction:** Modal dialog (pre-filled with current name and description), "Update" button.
- **Delete confirmation:** Modal dialog showing collection name + page count, red "Delete" button.
- **Remove page:** ✕ button on the right of each bookmark row in the bookmarks view; no confirmation needed.

---

## Architecture

### What already exists

| Capability | API | DB | Extension |
|---|---|---|---|
| View pages | `GET /collections/{id}/bookmarks` ✅ | `list_bookmarks()` ✅ | Needs JS wiring ✅ (click bug fixed) |
| Remove page | `DELETE /bookmarks/{id}` ✅ | `delete_bookmark()` ✅ | Needs ✕ button + handler |
| Delete collection | `DELETE /collections/{id}` ✅ | `delete_collection()` ✅ | Needs confirmation dialog + handler |
| Rename collection | ❌ missing | ❌ missing | Needs modal + handler |

### What needs to be built

1. **DB layer:** `update_collection(coll_id, name, description)` method
2. **API:** `CollectionUpdate` schema + `PATCH /collections/{id}` endpoint
3. **Extension `api.js`:** `updateCollection(id, name, desc)` helper
4. **Extension `sidepanel.js`:** ⋮ menus, header icons, all dialog logic
5. **Extension `sidepanel.html`:** Rename modal + delete-collection dialog (static markup)
6. **Extension `sidepanel.css`:** Dropdown menu, header icon buttons, row ✕ button

---

## Data Layer

### `bookmark_context/storage/database.py`

Add one method:

```python
def update_collection(self, coll_id: str, name: str, description: str) -> None:
    with self._connect() as conn:
        conn.execute(
            "UPDATE collections SET name = ?, description = ?, updated_at = ? WHERE id = ?",
            (name, description, _now(), coll_id),
        )
```

---

## API

### `bookmark_context/api/schemas.py`

Add:

```python
class CollectionUpdate(BaseModel):
    name: str
    description: str = ""
```

### `bookmark_context/api/collections.py`

Add:

```python
from bookmark_context.api.schemas import CollectionUpdate

@router.patch("/{collection_id}", response_model=CollectionResponse)
def rename_collection(collection_id: str, body: CollectionUpdate, request: Request):
    db = request.app.state.db
    if not db.get_collection(collection_id):
        raise HTTPException(status_code=404, detail="Collection not found")
    db.update_collection(collection_id, body.name, body.description)
    coll = db.get_collection(collection_id)
    count = len(db.list_bookmarks(collection_id))
    return CollectionResponse(**coll, bookmark_count=count)
```

---

## Extension: `extension/shared/api.js`

`deleteCollection` already exists. Add two new helpers:

```js
updateCollection: (id, name, description) =>
  request("PATCH", `/collections/${id}`, { name, description }),

deleteBookmark: (bookmarkId) =>
  request("DELETE", `/bookmarks/${bookmarkId}`),
```

---

## Extension: `sidepanel.html`

Add two static dialogs (inside `<body>`, alongside existing dialogs):

### Rename dialog

```html
<dialog id="rename-collection-dialog">
  <h3>Rename Collection</h3>
  <input type="text" id="rename-collection-name" placeholder="Name" autocomplete="off">
  <input type="text" id="rename-collection-desc" placeholder="Description (optional)" autocomplete="off">
  <div class="dialog-buttons">
    <button id="btn-update-collection" class="btn-primary">Update</button>
    <button id="btn-cancel-rename" class="btn-secondary">Cancel</button>
  </div>
</dialog>
```

### Delete-collection dialog

```html
<dialog id="delete-collection-dialog">
  <h3>Delete Collection</h3>
  <p id="delete-collection-message" style="font-size:12px;color:#94a3b8;margin:4px 0 12px"></p>
  <div class="dialog-buttons">
    <button id="btn-confirm-delete-collection" class="btn-danger">Delete</button>
    <button id="btn-cancel-delete-collection" class="btn-secondary">Cancel</button>
  </div>
</dialog>
```

### Bookmarks-section header

Replace the current plain `<div class="section-header">` in `#bookmarks-section` with:

```html
<div class="section-header">
  <button id="btn-back" class="btn-small">← Back</button>
  <span id="selected-collection-name" style="font-weight:600;flex:1;margin-left:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></span>
  <button id="btn-rename-collection" class="btn-icon" title="Rename collection">✎</button>
  <button id="btn-delete-collection" class="btn-icon btn-icon-danger" title="Delete collection">🗑</button>
</div>
```

---

## Extension: `sidepanel.js`

### Collection list rendering

Each `<li>` in `#collections-list` currently has the collection name and page count. Add a ⋮ button and dropdown:

```js
// Inside renderCollection(c):
const li = document.createElement("li");
li.className = "collection-item";
li.dataset.id = c.id;
li.innerHTML = `
  <span class="coll-icon">🗂</span>
  <span class="coll-name">${escHtml(c.name)}</span>
  <span class="coll-count">${c.bookmark_count} pages</span>
  <button class="btn-kebab" data-id="${c.id}" title="Collection options">⋮</button>
`;
li.querySelector(".coll-name").addEventListener("click", () => openCollection(c));
li.querySelector(".btn-kebab").addEventListener("click", (e) => {
  e.stopPropagation();
  openKebabMenu(e.currentTarget, c);
});
```

### Kebab dropdown

A single shared `<div id="kebab-menu">` appended to `<body>`. Positioned absolutely near the triggering button.

```js
function openKebabMenu(anchor, collection) {
  const menu = document.getElementById("kebab-menu");
  menu.innerHTML = `
    <div class="menu-item" id="menu-rename">✎ Rename</div>
    <div class="menu-item menu-item-danger" id="menu-delete">🗑 Delete</div>
  `;
  // position menu near anchor
  const rect = anchor.getBoundingClientRect();
  menu.style.top = (rect.bottom + 4) + "px";
  menu.style.right = (window.innerWidth - rect.right) + "px";
  menu.style.display = "block";
  document.getElementById("menu-rename").onclick = () => { closeKebabMenu(); openRenameDialog(collection); };
  document.getElementById("menu-delete").onclick = () => { closeKebabMenu(); openDeleteCollectionDialog(collection); };
}
function closeKebabMenu() {
  document.getElementById("kebab-menu").style.display = "none";
}
document.addEventListener("click", closeKebabMenu);
```

Add to `sidepanel.html`:
```html
<div id="kebab-menu" style="display:none"></div>
```

### Rename dialog logic

```js
let _renamingCollection = null;

function openRenameDialog(collection) {
  _renamingCollection = collection;
  document.getElementById("rename-collection-name").value = collection.name;
  document.getElementById("rename-collection-desc").value = collection.description || "";
  document.getElementById("rename-collection-dialog").showModal();
}

document.getElementById("btn-update-collection").addEventListener("click", async () => {
  const name = document.getElementById("rename-collection-name").value.trim();
  if (!name || !_renamingCollection) return;
  const updatedId = _renamingCollection.id;
  await api.updateCollection(updatedId, name,
    document.getElementById("rename-collection-desc").value.trim());
  document.getElementById("rename-collection-dialog").close();
  _renamingCollection = null;
  await loadCollections();
  // If we are currently viewing this collection, update the header name live
  if (_selectedCollection?.id === updatedId) {
    _selectedCollection.name = name;
    document.getElementById("selected-collection-name").textContent = name;
  }
});

document.getElementById("btn-cancel-rename").addEventListener("click", () => {
  document.getElementById("rename-collection-dialog").close();
  _renamingCollection = null;
});
```

### Header ✎ / 🗑 buttons

```js
document.getElementById("btn-rename-collection").addEventListener("click", () => {
  if (_selectedCollection) openRenameDialog(_selectedCollection);
});

document.getElementById("btn-delete-collection").addEventListener("click", () => {
  if (_selectedCollection) openDeleteCollectionDialog(_selectedCollection);
});
```

### Delete collection dialog logic

```js
let _deletingCollection = null;

function openDeleteCollectionDialog(collection) {
  _deletingCollection = collection;
  document.getElementById("delete-collection-message").innerHTML =
    `Delete <strong>${escHtml(collection.name)}</strong>?<br>
     <span style="color:#f87171">This will permanently remove ${collection.bookmark_count} saved page(s).</span>`;
  document.getElementById("delete-collection-dialog").showModal();
}

document.getElementById("btn-confirm-delete-collection").addEventListener("click", async () => {
  if (!_deletingCollection) return;
  await api.deleteCollection(_deletingCollection.id);
  document.getElementById("delete-collection-dialog").close();
  _deletingCollection = null;
  // Return to collections list
  document.getElementById("bookmarks-section").style.display = "none";
  document.getElementById("collections-section").style.display = "";
  _selectedCollection = null;
  await loadCollections();
});

document.getElementById("btn-cancel-delete-collection").addEventListener("click", () => {
  document.getElementById("delete-collection-dialog").close();
  _deletingCollection = null;
});
```

### Remove page (✕ per bookmark row)

```js
// Inside renderBookmark(bm):
const li = document.createElement("li");
li.className = "bookmark-item";
li.innerHTML = `
  <div class="bm-info">
    <div class="bm-title">${escHtml(bm.title || bm.url)}</div>
    <div class="bm-url">${escHtml(new URL(bm.url).hostname)}</div>
  </div>
  <span class="bm-status ${bm.index_status}">${statusLabel(bm.index_status)}</span>
  <button class="btn-remove-bm" data-id="${bm.id}" title="Remove from collection">✕</button>
`;
li.querySelector(".btn-remove-bm").addEventListener("click", async (e) => {
  e.stopPropagation();
  await api.deleteBookmark(bm.id);
  await loadBookmarks(_selectedCollection.id);
});
```

### `_selectedCollection` state

The current code uses `selectedCollectionId` (a string). Rename it to `_selectedCollection` and store the full collection object (id, name, description, bookmark_count) so dialogs can pre-fill fields and show page counts. Replace all existing `selectedCollectionId` references accordingly (5 occurrences in `sidepanel.js`). Access the id via `_selectedCollection.id` everywhere it was previously `selectedCollectionId`.

---

## Extension: `sidepanel.css`

New styles needed:

```css
/* Header icon buttons (✎ 🗑 in bookmarks header) */
.btn-icon { background: none; border: none; color: #64748b; cursor: pointer; font-size: 13px; padding: 2px 5px; border-radius: 4px; }
.btn-icon:hover { background: #1e293b; color: #e2e8f0; }
.btn-icon-danger:hover { color: #ef4444; }

/* ⋮ kebab button on collection rows */
.btn-kebab { background: none; border: none; color: #475569; cursor: pointer; font-size: 15px; padding: 0 3px; line-height: 1; border-radius: 4px; }
.btn-kebab:hover { background: rgba(99,102,241,.2); color: #a5b4fc; }

/* Floating kebab dropdown */
#kebab-menu { position: fixed; background: #1e293b; border: 1px solid #334155; border-radius: 6px; padding: 4px; z-index: 100; min-width: 120px; box-shadow: 0 4px 16px rgba(0,0,0,.5); }
.menu-item { padding: 6px 10px; cursor: pointer; border-radius: 4px; color: #e2e8f0; font-size: 11px; }
.menu-item:hover { background: #334155; }
.menu-item-danger { color: #ef4444; }
.menu-item-danger:hover { background: rgba(239,68,68,.15); }

/* Remove (✕) button on bookmark rows */
.btn-remove-bm { background: none; border: none; color: #475569; cursor: pointer; font-size: 12px; padding: 1px 4px; border-radius: 3px; opacity: 0; transition: opacity .15s; }
.bookmark-item:hover .btn-remove-bm { opacity: 1; }
.btn-remove-bm:hover { color: #ef4444; }

/* Danger button variant for delete dialogs */
.btn-danger { background: #dc2626; border: none; color: white; border-radius: 6px; padding: 6px 12px; font-size: 12px; cursor: pointer; }
.btn-danger:hover { background: #b91c1c; }
```

---

## Testing

### `tests/storage/test_database.py`

- `test_update_collection_changes_name_and_description` — create, update, get, assert fields changed
- `test_update_collection_updates_updated_at` — verify `updated_at` changes

### `tests/api/test_collections.py`

- `test_rename_collection_returns_updated_response` — PATCH with new name/desc → 200 with updated fields
- `test_rename_collection_returns_404_for_missing` — PATCH nonexistent id → 404
- `test_rename_collection_preserves_bookmark_count` — PATCH on collection with bookmarks → count correct in response

---

## Out of scope

- Drag-to-reorder collections
- Moving a bookmark between collections
- Undo/undo-delete
- Bulk remove
