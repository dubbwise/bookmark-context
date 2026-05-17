import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resolveTheme, applyTheme } from "./theme";

function mockMatchMedia(dark: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("dark") ? dark : !dark,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

describe("resolveTheme", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns light for light theme", () => {
    expect(resolveTheme("light")).toBe("light");
  });

  it("returns dark for dark theme", () => {
    expect(resolveTheme("dark")).toBe("dark");
  });

  it("returns dark when system prefers dark", () => {
    mockMatchMedia(true);
    expect(resolveTheme("system")).toBe("dark");
  });

  it("returns light when system prefers light", () => {
    mockMatchMedia(false);
    expect(resolveTheme("system")).toBe("light");
  });
});

describe("applyTheme", () => {
  beforeEach(() => {
    document.documentElement.classList.remove("dark");
  });

  it("adds dark class for dark theme", () => {
    applyTheme("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("removes dark class for light theme", () => {
    document.documentElement.classList.add("dark");
    applyTheme("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
