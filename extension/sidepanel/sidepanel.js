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

// --- Init ---
async function init() {
  await checkDaemon();
  await loadCurrentPage();
  await loadCollections();
  // poll daemon status every 10 seconds
  setInterval(checkDaemon, 10_000);
}

init();
