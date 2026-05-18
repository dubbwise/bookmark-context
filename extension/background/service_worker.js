import { api } from "../shared/api.js";
import { capturePageHtml } from "../shared/capturePage.js";

const MENU_ID = "bookmark-context-add";
const SUBMENU_NEW = "bookmark-context-new";

async function ensurePanelBehavior() {
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
}

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

  const html = await capturePageHtml(tab.id);

  try {
    const result = await api.addBookmark(
      collectionId,
      tab.url,
      tab.title || tab.url,
      html,
      false,
      tab.favIconUrl || "",
    );
    if (result?.status === "scan_warning") {
      await chrome.storage.session.set({
        pendingScanWarning: {
          collectionId,
          url: tab.url,
          title: tab.title || tab.url,
          html,
          faviconUrl: tab.favIconUrl || "",
          warning: result,
        },
      });
      await chrome.sidePanel.open({ tabId: tab.id });
      await chrome.action.setBadgeText({ text: "!", tabId: tab.id });
      await chrome.action.setBadgeBackgroundColor({ color: "#f59e0b", tabId: tab.id });
      return;
    }
    await chrome.action.setBadgeText({ text: "✓", tabId: tab.id });
    await chrome.action.setBadgeBackgroundColor({ color: "#22c55e", tabId: tab.id });
    setTimeout(() => {
      chrome.action.setBadgeText({ text: "", tabId: tab.id });
    }, 2000);
  } catch (e) {
    console.error("Failed to add bookmark:", e);
  }
});

// Rebuild menu on install and startup; link action icon to panel toggle
chrome.runtime.onInstalled.addListener(async () => {
  await ensurePanelBehavior();
  await rebuildMenu();
});
chrome.runtime.onStartup.addListener(async () => {
  await ensurePanelBehavior();
  await rebuildMenu();
});

// Rebuild menu when the side panel creates a new collection
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "COLLECTIONS_CHANGED") rebuildMenu();
});
