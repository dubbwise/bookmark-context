import { useCallback, useEffect, useState } from "react";
import type { CurrentTab } from "../types";

function tabToCurrentTab(tab: chrome.tabs.Tab): CurrentTab | null {
  if (!tab.url && !tab.pendingUrl && !tab.title) return null;
  return {
    title: tab.title || tab.url || tab.pendingUrl || "",
    url: tab.url || tab.pendingUrl || "",
    faviconUrl: tab.favIconUrl,
  };
}

export function useActiveTab(): CurrentTab | null {
  const [currentTab, setCurrentTab] = useState<CurrentTab | null>(null);

  const syncTab = useCallback(async (tabId?: number) => {
    try {
      const tab =
        tabId !== undefined
          ? await chrome.tabs.get(tabId)
          : (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
      if (tab) setCurrentTab(tabToCurrentTab(tab));
    } catch {
      // tab closed or unavailable
    }
  }, []);

  useEffect(() => {
    syncTab();

    const onActivated = (info: chrome.tabs.TabActiveInfo) => {
      void syncTab(info.tabId);
    };

    const onUpdated = (tabId: number, _changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
      void chrome.tabs.query({ active: true, currentWindow: true }).then(([active]) => {
        if (active?.id === tabId) setCurrentTab(tabToCurrentTab(tab));
      });
    };

    chrome.tabs.onActivated.addListener(onActivated);
    chrome.tabs.onUpdated.addListener(onUpdated);
    return () => {
      chrome.tabs.onActivated.removeListener(onActivated);
      chrome.tabs.onUpdated.removeListener(onUpdated);
    };
  }, [syncTab]);

  return currentTab;
}
