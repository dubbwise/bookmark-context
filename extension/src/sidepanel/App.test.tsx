import { render, screen, act } from "@testing-library/react";
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
    tabs: { query: vi.fn().mockResolvedValue([{ title: "Test Page", url: "https://example.com" }]) },
    storage: { sync: { get: vi.fn().mockResolvedValue({ daemonPort: 7331 }) } },
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
});
