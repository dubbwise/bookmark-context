import { describe, it, expect } from "vitest";
import { getFaviconCandidates, getFaviconKey } from "./favicon";

describe("getFaviconCandidates", () => {
  it("prefers stored favicon_url", () => {
    expect(getFaviconCandidates("https://example.com", "https://cdn.example.com/icon.png")).toEqual([
      "https://cdn.example.com/icon.png",
      "https://example.com/favicon.ico",
      "https://www.google.com/s2/favicons?domain=example.com&sz=32",
    ]);
  });

  it("falls back to origin favicon.ico and google s2", () => {
    expect(getFaviconCandidates("https://example.com/page", "")).toEqual([
      "https://example.com/favicon.ico",
      "https://www.google.com/s2/favicons?domain=example.com&sz=32",
    ]);
  });

  it("skips chrome-internal stored favicon urls", () => {
    expect(
      getFaviconCandidates(
        "https://example.com",
        "chrome://favicon/size/16@1x/https://example.com",
      ),
    ).toEqual([
      "https://example.com/favicon.ico",
      "https://www.google.com/s2/favicons?domain=example.com&sz=32",
    ]);
  });

  it("returns empty for invalid url without stored favicon", () => {
    expect(getFaviconCandidates("not-a-url", "")).toEqual([]);
  });
});

describe("getFaviconKey", () => {
  it("matches the first favicon candidate", () => {
    expect(getFaviconKey("https://example.com", "https://cdn.example.com/icon.png")).toBe(
      "https://cdn.example.com/icon.png",
    );
  });
});
