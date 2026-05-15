# Bookmark Context — Chrome Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome Manifest V3 extension with a persistent side panel for managing bookmark collections and a right-click context menu for quick-add, communicating with the local daemon at `http://localhost:7331`.

**Architecture:** Pure vanilla JS (no build step, no bundler). The service worker registers the context menu and handles background events. A side panel provides the main UI for browsing and managing collections. A content script captures rendered page HTML when the user adds a page, forwarding it to the daemon via the service worker.

**Prerequisite:** The daemon from `docs/superpowers/plans/2026-05-15-daemon-mcp.md` must be running at `http://localhost:7331`.

**Tech Stack:** Chrome Manifest V3, vanilla JS (ES modules), HTML, CSS — no build tools required.

---

## File Map

```
extension/
├── manifest.json
├── background/
│   └── service_worker.js       # context menu, message routing, daemon health check
├── sidepanel/
│   ├── sidepanel.html
│   ├── sidepanel.js            # side panel logic
│   └── sidepanel.css
├── content/
│   └── content_script.js       # captures rendered HTML, relays to service worker
├── options/
│   ├── options.html            # settings page (daemon port, AI backend)
│   └── options.js
└── shared/
    └── api.js                  # thin wrapper around fetch() → daemon REST API
```

There are no automated tests for the extension (manual testing only in v1, as per the spec). Each task ends with a manual verification step.

---

## Task 1: Manifest and Skeleton

**Files:**
- Create: `extension/manifest.json`
- Create: `extension/background/service_worker.js` (stub)
- Create: `extension/sidepanel/sidepanel.html` (stub)
- Create: `extension/sidepanel/sidepanel.js` (stub)
- Create: `extension/sidepanel/sidepanel.css` (stub)
- Create: `extension/content/content_script.js` (stub)
- Create: `extension/options/options.html` (stub)
- Create: `extension/options/options.js` (stub)
- Create: `extension/shared/api.js` (stub)

- [ ] **Step 1: Create manifest.json**

`extension/manifest.json`:
```json
{
  "manifest_version": 3,
  "name": "Bookmark Context",
  "version": "0.1.0",
  "description": "Organise bookmarks into collections and ask questions about them in Cursor.",
  "permissions": [
    "contextMenus",
    "sidePanel",
    "activeTab",
    "scripting",
    "storage"
  ],
  "host_permissions": [
    "http://localhost:7331/*"
  ],
  "background": {
    "service_worker": "background/service_worker.js",
    "type": "module"
  },
  "side_panel": {
    "default_path": "sidepanel/sidepanel.html"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/content_script.js"],
      "run_at": "document_idle"
    }
  ],
  "options_page": "options/options.html",
  "action": {
    "default_title": "Open Bookmark Context"
  }
}
```

- [ ] **Step 2: Create stub files**

`extension/background/service_worker.js`:
```js
console.log("Bookmark Context service worker started");
```

`extension/sidepanel/sidepanel.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="sidepanel.css">
  <title>Bookmark Context</title>
</head>
<body>
  <p>Loading…</p>
  <script type="module" src="sidepanel.js"></script>
</body>
</html>
```

`extension/sidepanel/sidepanel.js`:
```js
document.body.textContent = "Bookmark Context loaded";
```

`extension/sidepanel/sidepanel.css`:
```css
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; font-size: 14px; }
```

`extension/content/content_script.js`:
```js
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "GET_HTML") {
    sendResponse({ html: document.documentElement.outerHTML });
  }
});
```

`extension/options/options.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Bookmark Context Settings</title></head>
<body>
  <h1>Settings</h1>
  <script type="module" src="options.js"></script>
</body>
</html>
```

`extension/options/options.js`:
```js
// Settings page — implemented in Task 5
```

`extension/shared/api.js`:
```js
// Daemon API wrapper — implemented in Task 2
export const DAEMON = "http://localhost:7331";
```

- [ ] **Step 3: Load the extension in Chrome and verify it loads**

1. Open Chrome → `chrome://extensions`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked" → select the `extension/` directory
4. Confirm: extension appears in the list with no errors
5. Click the extension icon → Chrome should open the side panel showing "Bookmark Context loaded"
6. Check the service worker console: `chrome://extensions` → "Inspect views: service worker" → should show `"Bookmark Context service worker started"`

- [ ] **Step 4: Commit**

```bash
git add extension/
git commit -m "feat: Chrome extension skeleton — manifest, stubs"
```

---

## Task 2: Daemon API Wrapper

**Files:**
- Modify: `extension/shared/api.js`

- [ ] **Step 1: Implement the API wrapper**

`extension/shared/api.js`:
```js
export const DAEMON = "http://localhost:7331";

async function request(method, path, body = null) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body !== null) opts.body = JSON.stringify(body);
  const res = await fetch(`${DAEMON}${path}`, opts);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  status: () => request("GET", "/status"),
  listCollections: () => request("GET", "/collections"),
  createCollection: (name, description = "") =>
    request("POST", "/collections", { name, description }),
  deleteCollection: (id) => request("DELETE", `/collections/${id}`),
  listBookmarks: (collectionId) =>
    request("GET", `/collections/${collectionId}/bookmarks`),
  addBookmark: (collectionId, url, title, html = null) =>
    request("POST", `/collections/${collectionId}/bookmarks`, { url, title, html }),
  deleteBookmark: (id) => request("DELETE", `/bookmarks/${id}`),
  reindexBookmark: (id) => request("POST", `/bookmarks/${id}/reindex`),
  askCollection: (collectionId, question) =>
    request("POST", `/collections/${collectionId}/ask`, { question }),
};
```

- [ ] **Step 2: Verify in browser console**

With the daemon running (`bookmark-context serve` in terminal), open the side panel DevTools console and run:

```js
// Paste this into the side panel console to verify
import("./shared/api.js").then(m => m.api.status()).then(console.log)
```

Or open `chrome-extension://<extension-id>/sidepanel/sidepanel.html` as a tab and test from the console.

Expected: `{status: "ok", version: "0.1.0", ai_backend: "claude"}`

- [ ] **Step 3: Commit**

```bash
git add extension/shared/api.js
git commit -m "feat: daemon API wrapper with fetch-based REST client"
```

---

## Task 3: Side Panel UI

**Files:**
- Modify: `extension/sidepanel/sidepanel.html`
- Modify: `extension/sidepanel/sidepanel.js`
- Modify: `extension/sidepanel/sidepanel.css`

- [ ] **Step 1: Build the side panel HTML structure**

`extension/sidepanel/sidepanel.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="sidepanel.css">
  <title>Bookmark Context</title>
</head>
<body>
  <header>
    <span class="logo">📚 Bookmark Context</span>
    <a href="../options/options.html" target="_blank" class="settings-link" title="Settings">⚙</a>
  </header>

  <div class="search-bar">
    <input type="text" id="search" placeholder="🔍  Search collections…" autocomplete="off">
  </div>

  <section class="collections-section">
    <div class="section-header">
      <span class="label">Collections</span>
      <button id="btn-new-collection" class="btn-small">+ New</button>
    </div>
    <ul id="collections-list"></ul>
  </section>

  <section class="current-page-section">
    <div class="label">Current page</div>
    <div id="current-page-card" class="page-card">
      <div id="current-page-title" class="page-title">—</div>
      <div id="current-page-url" class="page-url">—</div>
    </div>
    <select id="add-to-collection-select">
      <option value="">Select collection…</option>
    </select>
    <button id="btn-add-to-collection" class="btn-primary">+ Add to collection</button>
  </section>

  <footer class="status-bar">
    <span id="daemon-indicator" class="indicator offline"></span>
    <span id="daemon-status-text">Checking daemon…</span>
  </footer>

  <!-- New collection dialog -->
  <dialog id="new-collection-dialog">
    <h3>New Collection</h3>
    <input type="text" id="new-collection-name" placeholder="Collection name" autocomplete="off">
    <input type="text" id="new-collection-desc" placeholder="Description (optional)" autocomplete="off">
    <div class="dialog-buttons">
      <button id="btn-create-collection" class="btn-primary">Create</button>
      <button id="btn-cancel-dialog" class="btn-secondary">Cancel</button>
    </div>
  </dialog>

  <script type="module" src="sidepanel.js"></script>
</body>
</html>
```

- [ ] **Step 2: Build the side panel CSS**

`extension/sidepanel/sidepanel.css`:
```css
* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 13px;
  background: #1a1a2e;
  color: #e2e8f0;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: rgba(99,102,241,0.15);
  border-bottom: 1px solid rgba(255,255,255,0.08);
  flex-shrink: 0;
}
.logo { font-weight: 600; }
.settings-link { color: #94a3b8; text-decoration: none; font-size: 16px; }

.search-bar { padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.06); flex-shrink: 0; }
.search-bar input {
  width: 100%;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.06);
  color: #e2e8f0;
  font-size: 13px;
}
.search-bar input:focus { outline: 2px solid #6366f1; }

.collections-section {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 12px 6px;
}
.label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #94a3b8;
}

#collections-list { list-style: none; padding: 0 6px; }
.collection-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 7px 8px;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 2px;
}
.collection-item:hover { background: rgba(99,102,241,0.15); }
.collection-item.active { background: rgba(99,102,241,0.25); }
.collection-name { font-weight: 500; }
.collection-count { color: #64748b; font-size: 11px; }

.current-page-section {
  padding: 10px 12px;
  border-top: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0;
}
.current-page-section .label { margin-bottom: 6px; }
.page-card {
  background: rgba(255,255,255,0.05);
  border-radius: 6px;
  padding: 8px 10px;
  margin-bottom: 8px;
}
.page-title { font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.page-url { font-size: 11px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }

select, .btn-primary, .btn-secondary, .btn-small {
  width: 100%;
  padding: 6px 10px;
  border-radius: 6px;
  border: none;
  font-size: 13px;
  cursor: pointer;
  margin-bottom: 6px;
}
select {
  background: rgba(255,255,255,0.06);
  color: #e2e8f0;
  border: 1px solid rgba(255,255,255,0.12);
}
.btn-primary { background: rgba(99,102,241,0.4); color: #e2e8f0; }
.btn-primary:hover { background: rgba(99,102,241,0.6); }
.btn-secondary { background: rgba(255,255,255,0.08); color: #e2e8f0; width: auto; }
.btn-small { width: auto; padding: 3px 8px; background: rgba(255,255,255,0.1); color: #e2e8f0; font-size: 12px; }

.status-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-top: 1px solid rgba(255,255,255,0.06);
  font-size: 11px;
  color: #64748b;
  flex-shrink: 0;
}
.indicator {
  width: 7px; height: 7px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}
.indicator.online { background: #22c55e; }
.indicator.offline { background: #ef4444; }

dialog {
  background: #1e2235;
  color: #e2e8f0;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 10px;
  padding: 16px;
  width: 280px;
}
dialog h3 { margin-bottom: 12px; }
dialog input {
  width: 100%;
  padding: 7px 10px;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.06);
  color: #e2e8f0;
  font-size: 13px;
  margin-bottom: 8px;
}
.dialog-buttons { display: flex; gap: 8px; margin-top: 4px; }
.dialog-buttons button { flex: 1; margin-bottom: 0; }
```

- [ ] **Step 3: Implement the side panel JS**

`extension/sidepanel/sidepanel.js`:
```js
import { api } from "../shared/api.js";

const $ = (id) => document.getElementById(id);

let collections = [];

// --- Daemon status ---
async function checkDaemon() {
  try {
    const s = await api.status();
    $("daemon-indicator").className = "indicator online";
    $("daemon-status-text").textContent = `Online · ${s.ai_backend}`;
    return true;
  } catch {
    $("daemon-indicator").className = "indicator offline";
    $("daemon-status-text").textContent = "Daemon offline";
    return false;
  }
}

// --- Collections ---
async function loadCollections() {
  try {
    collections = await api.listCollections();
    renderCollections();
    populateAddSelect();
  } catch {
    // daemon offline — handled by status check
  }
}

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
      </li>`
    )
    .join("");
}

function populateAddSelect() {
  const sel = $("add-to-collection-select");
  sel.innerHTML =
    '<option value="">Select collection…</option>' +
    collections
      .map((c) => `<option value="${c.id}">${escHtml(c.name)}</option>`)
      .join("");
}

// --- Current page ---
async function loadCurrentPage() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  $("current-page-title").textContent = tab.title || tab.url;
  $("current-page-url").textContent = tab.url;
}

// --- Add to collection ---
$("btn-add-to-collection").addEventListener("click", async () => {
  const collectionId = $("add-to-collection-select").value;
  if (!collectionId) return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  // capture rendered HTML via content script
  let html = null;
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => document.documentElement.outerHTML,
    });
    html = result?.result || null;
  } catch {
    // page may not allow scripting — proceed without HTML
  }

  try {
    await api.addBookmark(collectionId, tab.url, tab.title || tab.url, html);
    await loadCollections();
    $("btn-add-to-collection").textContent = "✓ Added";
    setTimeout(() => { $("btn-add-to-collection").textContent = "+ Add to collection"; }, 2000);
  } catch (e) {
    alert(`Failed to add bookmark: ${e.message}`);
  }
});

// --- New collection dialog ---
$("btn-new-collection").addEventListener("click", () => {
  $("new-collection-dialog").showModal();
  $("new-collection-name").focus();
});
$("btn-cancel-dialog").addEventListener("click", () => {
  $("new-collection-dialog").close();
});
$("btn-create-collection").addEventListener("click", async () => {
  const name = $("new-collection-name").value.trim();
  if (!name) return;
  const desc = $("new-collection-desc").value.trim();
  try {
    await api.createCollection(name, desc);
    $("new-collection-name").value = "";
    $("new-collection-desc").value = "";
    $("new-collection-dialog").close();
    await loadCollections();
  } catch (e) {
    alert(`Failed to create collection: ${e.message}`);
  }
});

// --- Search ---
$("search").addEventListener("input", (e) => renderCollections(e.target.value));

// --- Helpers ---
function escHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// --- Init ---
async function init() {
  await checkDaemon();
  await loadCurrentPage();
  await loadCollections();
  // poll daemon status every 10 seconds
  setInterval(checkDaemon, 10_000);
}

init();
```

- [ ] **Step 4: Manually verify the side panel**

Start the daemon:
```bash
bookmark-context serve
```

Then in Chrome:
1. Reload the extension (`chrome://extensions` → Reload)
2. Open the side panel
3. Verify: daemon status bar shows "Online · claude"
4. Click "+ New" → create a collection called "Test Collection"
5. Verify: collection appears in the list with "0 pages"
6. Navigate to any public page (e.g., `https://news.ycombinator.com`)
7. Select "Test Collection" in the dropdown → click "+ Add to collection"
8. Verify: button briefly shows "✓ Added", count updates to "1 pages"
9. Stop the daemon (Ctrl+C) — status bar should show "Daemon offline" within 10 seconds

- [ ] **Step 5: Commit**

```bash
git add extension/sidepanel/
git commit -m "feat: side panel UI with collections list, add bookmark, status bar"
```

---

## Task 4: Context Menu (Right-Click Quick-Add)

**Files:**
- Modify: `extension/background/service_worker.js`

- [ ] **Step 1: Implement the service worker**

`extension/background/service_worker.js`:
```js
import { api } from "../shared/api.js";

const MENU_ID = "bookmark-context-add";
const SUBMENU_NEW = "bookmark-context-new";

// Rebuild context menu whenever collections change
async function rebuildMenu() {
  await chrome.contextMenus.removeAll();

  chrome.contextMenus.create({
    id: MENU_ID,
    title: "Bookmark Context",
    contexts: ["page"],
  });

  let collections = [];
  try {
    collections = await api.listCollections();
  } catch {
    chrome.contextMenus.create({
      id: "bc-offline",
      parentId: MENU_ID,
      title: "⚠ Daemon offline",
      contexts: ["page"],
      enabled: false,
    });
    return;
  }

  for (const c of collections) {
    chrome.contextMenus.create({
      id: `bc-col-${c.id}`,
      parentId: MENU_ID,
      title: c.name,
      contexts: ["page"],
    });
  }

  chrome.contextMenus.create({
    id: MENU_ID + "-sep",
    parentId: MENU_ID,
    type: "separator",
    contexts: ["page"],
  });
  chrome.contextMenus.create({
    id: SUBMENU_NEW,
    parentId: MENU_ID,
    title: "New collection…",
    contexts: ["page"],
  });
}

// Context menu click handler
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;

  if (info.menuItemId === SUBMENU_NEW) {
    // Open side panel and let user create collection there
    await chrome.sidePanel.open({ tabId: tab.id });
    return;
  }

  if (!String(info.menuItemId).startsWith("bc-col-")) return;
  const collectionId = String(info.menuItemId).replace("bc-col-", "");

  // Capture rendered HTML
  let html = null;
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => document.documentElement.outerHTML,
    });
    html = result?.result || null;
  } catch {
    // proceed without HTML
  }

  try {
    await api.addBookmark(collectionId, tab.url, tab.title || tab.url, html);
    // Show a brief badge on the extension icon
    await chrome.action.setBadgeText({ text: "✓", tabId: tab.id });
    await chrome.action.setBadgeBackgroundColor({ color: "#22c55e", tabId: tab.id });
    setTimeout(() => {
      chrome.action.setBadgeText({ text: "", tabId: tab.id });
    }, 2000);
  } catch (e) {
    console.error("Failed to add bookmark:", e);
  }
});

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ tabId: tab.id });
});

// Rebuild menu on install and startup
chrome.runtime.onInstalled.addListener(rebuildMenu);
chrome.runtime.onStartup.addListener(rebuildMenu);

// Rebuild menu when the side panel creates a new collection
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "COLLECTIONS_CHANGED") rebuildMenu();
});
```

- [ ] **Step 2: Wire COLLECTIONS_CHANGED message from side panel**

Add to the bottom of `extension/sidepanel/sidepanel.js`, inside the `createCollection` handler after `await loadCollections()`:

```js
// After: await loadCollections();
chrome.runtime.sendMessage({ type: "COLLECTIONS_CHANGED" });
```

- [ ] **Step 3: Manually verify the context menu**

With the daemon running and the extension reloaded:
1. Right-click any page
2. Verify: "Bookmark Context" submenu appears with your collections listed
3. Click a collection name
4. Verify: extension icon briefly shows "✓" badge
5. Open the side panel → the collection count should have incremented
6. Stop the daemon, right-click again
7. Verify: submenu shows "⚠ Daemon offline" (disabled)

- [ ] **Step 4: Commit**

```bash
git add extension/background/service_worker.js extension/sidepanel/sidepanel.js
git commit -m "feat: right-click context menu for quick-add to collection"
```

---

## Task 5: Options Page (Settings)

**Files:**
- Modify: `extension/options/options.html`
- Modify: `extension/options/options.js`

- [ ] **Step 1: Implement options page**

`extension/options/options.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Bookmark Context — Settings</title>
  <style>
    body { font-family: system-ui, sans-serif; font-size: 14px; max-width: 480px; margin: 40px auto; padding: 0 20px; background: #1a1a2e; color: #e2e8f0; }
    h1 { margin-bottom: 24px; font-size: 1.3rem; }
    label { display: block; margin-bottom: 4px; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; }
    input, select { width: 100%; padding: 8px 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.06); color: #e2e8f0; font-size: 14px; margin-bottom: 16px; }
    button { padding: 8px 20px; border-radius: 6px; border: none; background: rgba(99,102,241,0.4); color: #e2e8f0; cursor: pointer; font-size: 14px; }
    button:hover { background: rgba(99,102,241,0.6); }
    #save-status { margin-left: 12px; color: #22c55e; font-size: 13px; }
  </style>
</head>
<body>
  <h1>⚙ Bookmark Context Settings</h1>

  <label for="daemon-port">Daemon port</label>
  <input type="number" id="daemon-port" value="7331">

  <div style="display:flex;gap:8px;margin-bottom:16px">
    <button id="btn-save">Save</button>
    <span id="save-status"></span>
  </div>

  <script type="module" src="options.js"></script>
</body>
</html>
```

`extension/options/options.js`:
```js
const DEFAULT_PORT = 7331;

async function load() {
  const { daemonPort = DEFAULT_PORT } = await chrome.storage.sync.get("daemonPort");
  document.getElementById("daemon-port").value = daemonPort;
}

document.getElementById("btn-save").addEventListener("click", async () => {
  const port = parseInt(document.getElementById("daemon-port").value, 10);
  await chrome.storage.sync.set({ daemonPort: port });
  const status = document.getElementById("save-status");
  status.textContent = "Saved ✓";
  setTimeout(() => { status.textContent = ""; }, 2000);
});

load();
```

- [ ] **Step 2: Make the daemon port configurable in api.js**

Replace `extension/shared/api.js` with a version that reads the port from storage:

`extension/shared/api.js`:
```js
async function getDaemonBase() {
  const { daemonPort = 7331 } = await chrome.storage.sync.get("daemonPort");
  return `http://localhost:${daemonPort}`;
}

async function request(method, path, body = null) {
  const base = await getDaemonBase();
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body !== null) opts.body = JSON.stringify(body);
  const res = await fetch(`${base}${path}`, opts);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  status: () => request("GET", "/status"),
  listCollections: () => request("GET", "/collections"),
  createCollection: (name, description = "") =>
    request("POST", "/collections", { name, description }),
  deleteCollection: (id) => request("DELETE", `/collections/${id}`),
  listBookmarks: (collectionId) =>
    request("GET", `/collections/${collectionId}/bookmarks`),
  addBookmark: (collectionId, url, title, html = null) =>
    request("POST", `/collections/${collectionId}/bookmarks`, { url, title, html }),
  deleteBookmark: (id) => request("DELETE", `/bookmarks/${id}`),
  reindexBookmark: (id) => request("POST", `/bookmarks/${id}/reindex`),
  askCollection: (collectionId, question) =>
    request("POST", `/collections/${collectionId}/ask`, { question }),
};
```

- [ ] **Step 3: Manually verify settings page**

1. Right-click extension icon → "Options"
2. Change port to `7332` → Save → verify "Saved ✓" appears
3. Change back to `7331` → Save
4. Reload side panel, verify daemon status still shows "Online"

- [ ] **Step 4: Commit**

```bash
git add extension/options/ extension/shared/api.js
git commit -m "feat: options page with configurable daemon port"
```

---

## Task 6: Indexing Status in Side Panel

**Files:**
- Modify: `extension/sidepanel/sidepanel.html`
- Modify: `extension/sidepanel/sidepanel.js`
- Modify: `extension/sidepanel/sidepanel.css`

- [ ] **Step 1: Add bookmark list view to side panel HTML**

Add after `</section>` (the collections section) and before `<section class="current-page-section">`:

```html
<!-- Bookmark list (shown when a collection is selected) -->
<section id="bookmarks-section" style="display:none">
  <div class="section-header">
    <button id="btn-back" class="btn-small">← Back</button>
    <span id="selected-collection-name" style="font-weight:600;flex:1;margin-left:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></span>
  </div>
  <ul id="bookmarks-list"></ul>
</section>
```

- [ ] **Step 2: Add bookmark list styles to sidepanel.css**

Append to `extension/sidepanel/sidepanel.css`:

```css
#bookmarks-list { list-style: none; padding: 0 6px; }
.bookmark-item {
  padding: 8px 8px;
  border-radius: 6px;
  margin-bottom: 3px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
}
.bookmark-item-title { font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bookmark-item-url { font-size: 11px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
.bookmark-status {
  display: inline-block;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  margin-top: 4px;
  font-weight: 600;
}
.status-done { background: rgba(34,197,94,0.15); color: #22c55e; }
.status-pending, .status-indexing { background: rgba(99,102,241,0.15); color: #818cf8; }
.status-error { background: rgba(239,68,68,0.15); color: #f87171; }
.bookmark-actions { margin-top: 6px; display: flex; gap: 6px; }
.btn-xs {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  background: rgba(255,255,255,0.08);
  color: #94a3b8;
}
.btn-xs:hover { background: rgba(255,255,255,0.15); }
.btn-xs.danger:hover { background: rgba(239,68,68,0.2); color: #f87171; }
```

- [ ] **Step 3: Add bookmark list logic to sidepanel.js**

Add to `extension/sidepanel/sidepanel.js` (before `init()`):

```js
// --- Bookmark list view ---
let selectedCollectionId = null;

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

$("btn-back").addEventListener("click", () => {
  selectedCollectionId = null;
  $("bookmarks-section").style.display = "none";
  $("collections-section").style.display = "";
  loadCollections();
});

async function renderBookmarks() {
  if (!selectedCollectionId) return;
  const bookmarks = await api.listBookmarks(selectedCollectionId);
  const list = $("bookmarks-list");
  if (!bookmarks.length) {
    list.innerHTML = '<li style="padding:12px 8px;color:#64748b;font-size:12px">No bookmarks yet. Add pages using the right-click menu or the panel below.</li>';
    return;
  }
  list.innerHTML = bookmarks.map((b) => `
    <li class="bookmark-item" data-id="${b.id}">
      <div class="bookmark-item-title">${escHtml(b.title || b.url)}</div>
      <div class="bookmark-item-url">${escHtml(b.url)}</div>
      <span class="bookmark-status status-${b.index_status}">${statusLabel(b.index_status)}</span>
      <div class="bookmark-actions">
        <button class="btn-xs" data-action="reindex" data-id="${b.id}">↻ Re-index</button>
        <button class="btn-xs danger" data-action="delete" data-id="${b.id}">✕ Remove</button>
      </div>
    </li>
  `).join("");
}

function statusLabel(status) {
  return { done: "✓ Indexed", pending: "⋯ Pending", indexing: "⟳ Indexing", error: "✕ Error" }[status] || status;
}

$("bookmarks-list").addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const { action, id } = btn.dataset;
  if (action === "delete") {
    await api.deleteBookmark(id);
    await renderBookmarks();
    await loadCollections();
  } else if (action === "reindex") {
    await api.reindexBookmark(id);
    await renderBookmarks();
  }
});

// Poll indexing status when bookmark list is visible
setInterval(async () => {
  if (selectedCollectionId && $("bookmarks-section").style.display !== "none") {
    await renderBookmarks();
  }
}, 3000);
```

- [ ] **Step 4: Manually verify bookmark list**

1. Open side panel, click a collection
2. Verify: bookmark list appears with status badges
3. Find a bookmark with `status-indexing` — it should update to `status-done` within a few seconds (polling every 3s)
4. Click "↻ Re-index" on a bookmark — status should briefly return to "Pending"
5. Click "✕ Remove" — bookmark disappears and back-button shows updated collection count
6. Click "← Back" — returns to collections list

- [ ] **Step 5: Commit**

```bash
git add extension/sidepanel/
git commit -m "feat: bookmark list view with indexing status and polling"
```

---

## Verification Checklist

Before declaring the extension complete, manually verify the full golden path:

- [ ] Install extension in Chrome (Load unpacked)
- [ ] Start daemon (`bookmark-context serve`)
- [ ] Status bar shows "Online · claude"
- [ ] Create two collections via "+ New" dialog
- [ ] Navigate to a public article, add it to a collection via the side panel
- [ ] Navigate to a second article, add it via right-click menu
- [ ] Click a collection → see both bookmarks, watch status change from Pending → Indexed
- [ ] Stop daemon → status bar shows "Daemon offline" within 10 seconds
- [ ] Restart daemon → status recovers automatically
- [ ] Open Options → change port to 7332 → change back to 7331 → verify daemon still connects

Once complete, configure Cursor:

```bash
pip install -e ./
```

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

Restart Cursor and verify the three MCP tools appear in the tool list.
