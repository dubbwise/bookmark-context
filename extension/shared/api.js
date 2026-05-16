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
  addBookmark: (collectionId, url, title, html = null, force = false) =>
    request("POST", `/collections/${collectionId}/bookmarks${force ? "?force=true" : ""}`, { url, title, html }),
  deleteBookmark: (id) => request("DELETE", `/bookmarks/${id}`),
  reindexBookmark: (id) => request("POST", `/bookmarks/${id}/reindex`),
};
