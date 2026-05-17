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
  closeKebabMenu();
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
let _pendingSave = null;

async function captureHtml(tabId) {
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => document.documentElement.outerHTML,
    });
    return result?.result || null;
  } catch {
    return null;
  }
}

async function confirmSave(collectionId, url, title, html) {
  const result = await api.addBookmark(collectionId, url, title, html);
  if (result && result.status === "scan_warning") {
    _pendingSave = { collectionId, url, title, html };
    $("scan-warning-summary").textContent =
      `Risk score ${result.risk_score.toFixed(2)} · signals: ${result.signals.join(", ")}`;
    $("scan-matches-list").innerHTML = result.matches
      .map((m) => `<li><code style="word-break:break-all">${escHtml(m)}</code></li>`)
      .join("");
    $("scan-details").style.display = "none";
    $("btn-scan-details-toggle").textContent = "Show details";
    $("scan-warning-dialog").showModal();
    return;
  }
  await loadCollections();
  $("btn-add-to-collection").textContent = "✓ Added";
  setTimeout(() => { $("btn-add-to-collection").textContent = "+ Add to collection"; }, 2000);
}

$("btn-add-to-collection").addEventListener("click", async () => {
  const collectionId = $("add-to-collection-select").value;
  if (!collectionId) return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  const html = await captureHtml(tab.id);
  try {
    await confirmSave(collectionId, tab.url, tab.title || tab.url, html);
  } catch (e) {
    alert(`Failed to add bookmark: ${e.message}`);
  }
});

$("btn-scan-discard").addEventListener("click", () => {
  $("scan-warning-dialog").close();
  _pendingSave = null;
});

$("btn-scan-details-toggle").addEventListener("click", () => {
  const visible = $("scan-details").style.display !== "none";
  $("scan-details").style.display = visible ? "none" : "";
  $("btn-scan-details-toggle").textContent = visible ? "Show details" : "Hide details";
});

$("btn-scan-force").addEventListener("click", async () => {
  $("scan-warning-dialog").close();
  if (!_pendingSave) return;
  const { collectionId, url, title, html } = _pendingSave;
  _pendingSave = null;
  try {
    await api.addBookmark(collectionId, url, title, html, true);
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
    chrome.runtime.sendMessage({ type: "COLLECTIONS_CHANGED" });
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

// --- Bookmark list view ---
let _selectedCollection = null;

$("collections-list").addEventListener("click", async (e) => {
  const btn = e.target.closest(".btn-kebab");
  if (btn) {
    const coll = collections.find((c) => c.id === btn.dataset.id);
    if (coll) openKebabMenu(btn, coll);
    return;
  }
  const item = e.target.closest(".collection-item");
  if (!item) return;
  _selectedCollection = collections.find((c) => c.id === item.dataset.id) || null;
  $("selected-collection-name").textContent = _selectedCollection?.name || "";
  await renderBookmarks();
  $("collections-section").style.display = "none";
  $("bookmarks-section").style.display = "";
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
  $("btn-update-collection").disabled = true;
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
      _selectedCollection = collections.find((c) => c.id === updatedId) || _selectedCollection;
      $("selected-collection-name").textContent = _selectedCollection.name;
    }
  } catch (e) {
    alert(`Failed to rename: ${e.message}`);
  } finally {
    $("btn-update-collection").disabled = false;
  }
});

$("btn-cancel-rename").addEventListener("click", () => {
  $("rename-collection-dialog").close();
  _renamingCollection = null;
});

$("btn-rename-collection").addEventListener("click", () => {
  if (_selectedCollection) openRenameDialog(_selectedCollection);
});

$("btn-back").addEventListener("click", () => {
  _selectedCollection = null;
  $("bookmarks-section").style.display = "none";
  $("collections-section").style.display = "";
  loadCollections();
});

async function renderBookmarks() {
  if (!_selectedCollection) return;
  const bookmarks = await api.listBookmarks(_selectedCollection.id);
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
  if (_selectedCollection && $("bookmarks-section").style.display !== "none") {
    await renderBookmarks();
  }
}, 3000);

// --- Init ---
async function init() {
  await checkDaemon();
  await loadCurrentPage();
  await loadCollections();
  // poll daemon status every 10 seconds
  setInterval(checkDaemon, 10_000);
}

init();
