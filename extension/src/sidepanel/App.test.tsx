import { render, screen, act, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("../api", () => ({
  api: {
    status: vi.fn().mockRejectedValue(new Error("offline")),
    listCollections: vi.fn().mockResolvedValue([]),
  },
}));

// Chrome API stub
Object.assign(globalThis, {
  chrome: {
    tabs: {
      query: vi.fn().mockResolvedValue([{ title: "Test Page", url: "https://example.com" }]),
      get: vi.fn().mockResolvedValue({ title: "Test Page", url: "https://example.com" }),
      onActivated: { addListener: vi.fn(), removeListener: vi.fn() },
      onUpdated: { addListener: vi.fn(), removeListener: vi.fn() },
    },
    storage: {
      sync: { get: vi.fn().mockResolvedValue({ daemonPort: 7331 }) },
      session: {
        get: vi.fn().mockResolvedValue({}),
        remove: vi.fn().mockResolvedValue(undefined),
      },
    },
  },
});

import App from "./App";

describe("App", () => {
  it("renders the header with logo text", async () => {
    await act(async () => { render(<App />); });
    expect(screen.getByText(/Bookmark Context/i)).toBeInTheDocument();
  });

  it("renders the status bar", async () => {
    await act(async () => { render(<App />); });
    expect(screen.getByText(/daemon/i)).toBeInTheDocument();
  });

  it("toggles search field when search button is clicked", async () => {
    await act(async () => { render(<App />); });
    expect(screen.queryByPlaceholderText(/search collections/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByTitle(/search collections/i));
    expect(screen.getByPlaceholderText(/search collections/i)).toBeInTheDocument();
    fireEvent.click(screen.getByTitle(/search collections/i));
    expect(screen.queryByPlaceholderText(/search collections/i)).not.toBeInTheDocument();
  });
});
