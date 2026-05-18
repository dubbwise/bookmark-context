import { describe, it, expect } from "vitest";
import { getFaviconCandidates } from "./favicon";

describe("getFaviconCandidates", () => {
  it("prefers stored favicon_url", () => {
    expect(getFaviconCandidates("https://example.com", "https://cdn.example.com/icon.png")).toEqual([
      "https://cdn.example.com/icon.png",
      "https://example.com/favicon.ico",
    ]);
  });

  it("falls back to origin favicon.ico", () => {
    expect(getFaviconCandidates("https://example.com/page", "")).toEqual([
      "https://example.com/favicon.ico",
    ]);
  });

  it("returns empty for invalid url without stored favicon", () => {
    expect(getFaviconCandidates("not-a-url", "")).toEqual([]);
  });
});
