import { describe, it, expect, vi, beforeEach } from "vitest";
import { reloadSidePanel } from "./reloadPanel";

describe("reloadSidePanel", () => {
  const reload = vi.fn();

  beforeEach(() => {
    reload.mockReset();
    vi.stubGlobal("chrome", {
      runtime: { reload },
    });
  });

  it("calls chrome.runtime.reload", () => {
    reloadSidePanel();
    expect(reload).toHaveBeenCalledOnce();
  });
});
