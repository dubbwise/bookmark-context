import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import AddToCollection from "./AddToCollection";
import type { Collection, ScanWarning } from "@/types";

const scanWarning: ScanWarning = {
  status: "scan_warning",
  risk_score: 0.85,
  signals: ["xss"],
  matches: ["<script>"],
};

vi.mock("@/lib/capturePage", () => ({
  capturePageHtml: vi.fn().mockResolvedValue("<html><body>test</body></html>"),
}));

const collections: Collection[] = [
  { id: "c1", name: "Research", description: "", created_at: "", updated_at: "", bookmark_count: 0 },
];

describe("AddToCollection", () => {
  it("shows page title when tab is set", () => {
    render(
      <AddToCollection
        currentTab={{ title: "My Page", url: "https://example.com" }}
        collections={collections}
        onAdd={vi.fn()}
      />,
    );
    expect(screen.getByText("My Page")).toBeInTheDocument();
  });

  it("shows placeholder when no tab", () => {
    render(<AddToCollection currentTab={null} collections={collections} onAdd={vi.fn()} />);
    expect(screen.getAllByText("—")).toHaveLength(2);
  });

  it("updates the displayed page when currentTab changes", () => {
    const { rerender } = render(
      <AddToCollection
        currentTab={{ title: "First", url: "https://first.com" }}
        collections={collections}
        onAdd={vi.fn()}
      />,
    );
    expect(screen.getByText("First")).toBeInTheDocument();

    rerender(
      <AddToCollection
        currentTab={{ title: "Second", url: "https://second.com" }}
        collections={collections}
        onAdd={vi.fn()}
      />,
    );
    expect(screen.getByText("Second")).toBeInTheDocument();
    expect(screen.getByText("https://second.com")).toBeInTheDocument();
  });

  it("shows scan warning when page was flagged", () => {
    render(
      <AddToCollection
        currentTab={{ title: "Risky", url: "https://x.com" }}
        collections={collections}
        scanWarning={scanWarning}
        onAdd={vi.fn()}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/suspicious content detected/i);
    expect(screen.getByRole("alert")).toHaveTextContent(/0\.85/);
  });

  it("does not show added state when add returns scan_warning", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn().mockResolvedValue("scan_warning");
    render(
      <AddToCollection
        currentTab={{ title: "P", url: "https://x.com" }}
        collections={collections}
        onAdd={onAdd}
      />,
    );
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "Research" }));
    await user.click(screen.getByRole("button", { name: /add to collection/i }));
    expect(onAdd).toHaveBeenCalled();
    expect(screen.queryByText("✓ Added")).not.toBeInTheDocument();
  });

  it("preselects active collection when on collection screen", () => {
    render(
      <AddToCollection
        currentTab={{ title: "P", url: "https://x.com" }}
        collections={collections}
        activeCollectionId="c1"
        onAdd={vi.fn()}
      />,
    );
    expect(screen.getByRole("combobox")).toHaveTextContent("Research");
    expect(screen.getByRole("button", { name: /add to collection/i })).toBeEnabled();
  });

  it("add button is disabled when no collection selected", () => {
    render(
      <AddToCollection
        currentTab={{ title: "P", url: "https://x.com" }}
        collections={collections}
        onAdd={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /add/i })).toBeDisabled();
  });
});
