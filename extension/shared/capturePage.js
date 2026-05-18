/** Capture rendered page HTML (service worker / shared JS). */

function wrapPlainTextAsHtml(text) {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<html><body><article>${escaped}</article></body></html>`;
}

async function tryExecuteOuterHtml(tabId) {
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => document.documentElement.outerHTML,
    });
    const html = result?.result;
    return typeof html === "string" && html.length > 0 ? html : null;
  } catch {
    return null;
  }
}

async function tryContentScriptHtml(tabId) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { type: "GET_HTML" });
    const html = response?.html;
    return typeof html === "string" && html.length > 0 ? html : null;
  } catch {
    return null;
  }
}

async function tryVisibleTextAsHtml(tabId) {
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => document.body?.innerText ?? "",
    });
    const text = result?.result;
    if (typeof text !== "string" || !text.trim()) return null;
    return wrapPlainTextAsHtml(text);
  } catch {
    return null;
  }
}

export async function capturePageHtml(tabId) {
  const id =
    tabId ??
    (await chrome.tabs.query({ active: true, currentWindow: true }))[0]?.id;
  if (id === undefined) return null;

  return (
    (await tryExecuteOuterHtml(id)) ??
    (await tryContentScriptHtml(id)) ??
    (await tryVisibleTextAsHtml(id))
  );
}
