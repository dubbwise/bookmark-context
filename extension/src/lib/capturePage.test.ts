import { describe, it, expect, vi, beforeEach } from "vitest";
import { capturePageHtml } from "./capturePage";

const sendMessage = vi.fn();
const executeScript = vi.fn();

beforeEach(() => {
  sendMessage.mockReset();
  executeScript.mockReset();
  Object.assign(globalThis, {
    chrome: {
      tabs: {
        query: vi.fn().mockResolvedValue([{ id: 42 }]),
        sendMessage,
      },
      scripting: { executeScript },
    },
  });
});

describe("capturePageHtml", () => {
  it("returns outerHTML from executeScript when available", async () => {
    executeScript.mockResolvedValue([{ result: "<html><body>ok</body></html>" }]);
    const html = await capturePageHtml();
    expect(html).toContain("ok");
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("falls back to content script GET_HTML", async () => {
    executeScript.mockRejectedValue(new Error("no access"));
    sendMessage.mockResolvedValue({ html: "<html><body>from cs</body></html>" });
    const html = await capturePageHtml();
    expect(html).toContain("from cs");
    expect(sendMessage).toHaveBeenCalledWith(42, { type: "GET_HTML" });
  });

  it("falls back to visible innerText wrapped as html", async () => {
    executeScript
      .mockRejectedValueOnce(new Error("no access"))
      .mockResolvedValueOnce([{ result: "Visible page text" }]);
    sendMessage.mockRejectedValue(new Error("no receiver"));
    const html = await capturePageHtml();
    expect(html).toContain("Visible page text");
  });
});
