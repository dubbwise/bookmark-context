import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import CollectionList from "./CollectionList";
import type { Collection } from "../types";

const mockCollections: Collection[] = [
  { id: "1", name: "Research", description: "", created_at: "", updated_at: "", bookmark_count: 3 },
  { id: "2", name: "Recipes", description: "", created_at: "", updated_at: "", bookmark_count: 0 },
];

describe("CollectionList", () => {
  it("renders all collection names", () => {
    render(<CollectionList collections={mockCollections} searchQuery="" onSelect={vi.fn()} onEdit={vi.fn()}  />);
    expect(screen.getByText("Research")).toBeInTheDocument();
    expect(screen.getByText("Recipes")).toBeInTheDocument();
  });

  it("shows bookmark count", () => {
    render(<CollectionList collections={mockCollections} searchQuery="" onSelect={vi.fn()} onEdit={vi.fn()}  />);
    expect(screen.getByText("3 pages")).toBeInTheDocument();
  });

  it("filters by search query", () => {
    render(<CollectionList collections={mockCollections} searchQuery="rec" onSelect={vi.fn()} onEdit={vi.fn()}  />);
    expect(screen.queryByText("Research")).not.toBeInTheDocument();
    expect(screen.getByText("Recipes")).toBeInTheDocument();
  });

  it("ignores whitespace-only search", () => {
    render(<CollectionList collections={mockCollections} searchQuery="   " onSelect={vi.fn()} onEdit={vi.fn()}  />);
    expect(screen.getByText("Research")).toBeInTheDocument();
    expect(screen.getByText("Recipes")).toBeInTheDocument();
  });

  it("calls onSelect when row is clicked", async () => {
    const onSelect = vi.fn();
    render(<CollectionList collections={mockCollections} searchQuery="" onSelect={onSelect} onEdit={vi.fn()}  />);
    await userEvent.click(screen.getByText("Research"));
    expect(onSelect).toHaveBeenCalledWith(mockCollections[0]);
  });

  it("opens options menu and calls onEdit", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(
      <CollectionList
        collections={mockCollections}
        searchQuery=""
        onSelect={vi.fn()}
        onEdit={onEdit}
      />,
    );
    await user.click(screen.getAllByLabelText("Options")[0]);
    await user.click(screen.getByRole("menuitem", { name: /edit/i }));
    expect(onEdit).toHaveBeenCalledWith(mockCollections[0]);
  });
});
