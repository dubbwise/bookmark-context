import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useActiveTab } from "./useActiveTab";

const onActivatedListeners: Array<(info: chrome.tabs.TabActiveInfo) => void> = [];
const onUpdatedListeners: Array<
  (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => void
> = [];

beforeEach(() => {
  onActivatedListeners.length = 0;
  onUpdatedListeners.length = 0;
  Object.assign(globalThis, {
    chrome: {
      tabs: {
        query: vi.fn().mockResolvedValue([
          { id: 1, title: "First", url: "https://first.com", favIconUrl: "https://first.com/f.ico" },
        ]),
        get: vi.fn().mockResolvedValue({
          id: 2,
          title: "Second",
          url: "https://second.com",
          favIconUrl: "https://second.com/f.ico",
        }),
        onActivated: {
          addListener: vi.fn((cb: (info: chrome.tabs.TabActiveInfo) => void) => {
            onActivatedListeners.push(cb);
          }),
          removeListener: vi.fn(),
        },
        onUpdated: {
          addListener: vi.fn(
            (
              cb: (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => void,
            ) => {
              onUpdatedListeners.push(cb);
            },
          ),
          removeListener: vi.fn(),
        },
      },
    },
  });
});

describe("useActiveTab", () => {
  it("loads the active tab on mount", async () => {
    const { result } = renderHook(() => useActiveTab());
    await waitFor(() => {
      expect(result.current).toEqual({
        title: "First",
        url: "https://first.com",
        faviconUrl: "https://first.com/f.ico",
      });
    });
  });

  it("updates when the active tab changes", async () => {
    const { result } = renderHook(() => useActiveTab());
    await waitFor(() => expect(result.current?.url).toBe("https://first.com"));

    await act(async () => {
      onActivatedListeners[0]?.({ tabId: 2, windowId: 1 });
    });

    await waitFor(() => {
      expect(result.current).toEqual({
        title: "Second",
        url: "https://second.com",
        faviconUrl: "https://second.com/f.ico",
      });
    });
  });

  it("updates when the active tab is updated", async () => {
    const { result } = renderHook(() => useActiveTab());
    await waitFor(() => expect(result.current?.url).toBe("https://first.com"));

    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { id: 1, title: "First", url: "https://first.com" } as chrome.tabs.Tab,
    ]);

    await act(async () => {
      onUpdatedListeners[0]?.(1, { title: "Renamed" }, {
        id: 1,
        title: "Renamed",
        url: "https://first.com/renamed",
        favIconUrl: "https://first.com/r.ico",
      } as chrome.tabs.Tab);
    });

    await waitFor(() => {
      expect(result.current).toEqual({
        title: "Renamed",
        url: "https://first.com/renamed",
        faviconUrl: "https://first.com/r.ico",
      });
    });
  });
});
