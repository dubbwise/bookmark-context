import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import BookmarkList from "./BookmarkList";
import type { Collection, Bookmark } from "../types";

const coll: Collection = { id: "c1", name: "Research", description: "", created_at: "", updated_at: "", bookmark_count: 1 };
const bookmarks: Bookmark[] = [
  { id: "b1", collection_id: "c1", url: "https://example.com", title: "Example", favicon_url: "https://example.com/favicon.ico", added_at: "", indexed_at: null, index_status: "done", error_message: null },
  { id: "b2", collection_id: "c1", url: "https://other.com", title: "Other", favicon_url: "", added_at: "", indexed_at: null, index_status: "error", error_message: null },
];

describe("BookmarkList", () => {
  it("renders collection name in header", () => {
    render(<BookmarkList collection={coll} bookmarks={bookmarks} onBack={vi.fn()} onEdit={vi.fn()} onDeleteBookmarks={vi.fn()} onReindex={vi.fn()} />);
    expect(screen.getByText("Research")).toBeInTheDocument();
  });

  it("renders bookmark titles", () => {
    render(<BookmarkList collection={coll} bookmarks={bookmarks} onBack={vi.fn()} onEdit={vi.fn()} onDeleteBookmarks={vi.fn()} onReindex={vi.fn()} />);
    expect(screen.getByText("Example")).toBeInTheDocument();
    expect(screen.getByText("Other")).toBeInTheDocument();
  });

  it("shows indexed status badge", () => {
    render(<BookmarkList collection={coll} bookmarks={bookmarks} onBack={vi.fn()} onEdit={vi.fn()} onDeleteBookmarks={vi.fn()} onReindex={vi.fn()} />);
    expect(screen.getByText("Indexed")).toBeInTheDocument();
    expect(screen.getByText("Error")).toBeInTheDocument();
  });

  it("calls onBack when back button clicked", async () => {
    const onBack = vi.fn();
    render(<BookmarkList collection={coll} bookmarks={[]} onBack={onBack} onEdit={vi.fn()} onDeleteBookmarks={vi.fn()} onReindex={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(onBack).toHaveBeenCalled();
  });

  it("select all toggles selection and bulk remove calls onDeleteBookmarks", async () => {
    const user = userEvent.setup();
    const onDeleteBookmarks = vi.fn().mockResolvedValue(undefined);
    render(
      <BookmarkList
        collection={coll}
        bookmarks={bookmarks}
        onBack={vi.fn()}
        onEdit={vi.fn()}
        onDeleteBookmarks={onDeleteBookmarks}
        onReindex={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("checkbox", { name: /select all bookmarks/i }));
    expect(screen.getByRole("button", { name: /remove 2 selected bookmarks/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /remove 2 selected bookmarks/i }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /^remove$/i }));
    expect(onDeleteBookmarks).toHaveBeenCalledWith(expect.arrayContaining(["b1", "b2"]));
  });
});
