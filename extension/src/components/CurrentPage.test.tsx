import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import CurrentPage from "./CurrentPage";
import type { Collection } from "../types";

// Chrome API stub needed for captureHtml
Object.assign(globalThis, {
  chrome: {
    tabs: { query: vi.fn().mockResolvedValue([{ id: 1, title: "Test", url: "https://example.com" }]) },
    scripting: {
      executeScript: vi.fn().mockResolvedValue([{ result: "<html></html>" }]),
    },
  },
});

const collections: Collection[] = [
  { id: "c1", name: "Research", description: "", created_at: "", updated_at: "", bookmark_count: 0 },
];

describe("CurrentPage", () => {
  it("shows page title when tab is set", () => {
    render(<CurrentPage currentTab={{ title: "My Page", url: "https://example.com" }} collections={collections} onAdd={vi.fn()} />);
    expect(screen.getByText("My Page")).toBeInTheDocument();
  });

  it("shows placeholder when no tab", () => {
    render(<CurrentPage currentTab={null} collections={collections} onAdd={vi.fn()} />);
    expect(screen.getAllByText("—")).toHaveLength(2);
  });

  it("add button is disabled when no collection selected", () => {
    render(<CurrentPage currentTab={{ title: "P", url: "https://x.com" }} collections={collections} onAdd={vi.fn()} />);
    expect(screen.getByRole("button", { name: /add/i })).toBeDisabled();
  });
});
