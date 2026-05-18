import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Bookmark, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ItemGroup } from "@/components/ui/item";
import BookmarkItem from "./BookmarkItem";
import type { Collection, Bookmark as BookmarkType } from "../types";

interface BookmarkListProps {
  collection: Collection;
  bookmarks: BookmarkType[];
  onBack: () => void;
  onEdit: () => void;
  onRequestRemoveSelected: (ids: string[]) => void;
  onReindexBookmarks: (ids: string[]) => void | Promise<void>;
  /** Incremented after a successful bulk remove so selection clears. */
  clearSelectionToken?: number;
}

export default function BookmarkList({
  collection,
  bookmarks,
  onBack,
  onEdit,
  onRequestRemoveSelected,
  onReindexBookmarks,
  clearSelectionToken = 0,
}: BookmarkListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [reindexing, setReindexing] = useState(false);

  useEffect(() => {
    const valid = new Set(bookmarks.map((b) => b.id));
    setSelectedIds((prev) => new Set([...prev].filter((id) => valid.has(id))));
  }, [bookmarks]);

  useEffect(() => {
    if (clearSelectionToken === 0) return;
    setSelectedIds(new Set());
  }, [clearSelectionToken]);

  const setSelected = useCallback((id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const n = bookmarks.length;
  const selectedCount = selectedIds.size;
  const allSelected = n > 0 && selectedCount === n;
  const someSelected = selectedCount > 0 && !allSelected;
  const headerChecked: boolean | "indeterminate" = allSelected
    ? true
    : someSelected
      ? "indeterminate"
      : false;

  async function handleReindexSelected() {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setReindexing(true);
    try {
      await onReindexBookmarks(ids);
    } catch {
      /* parent toasts on failure */
    } finally {
      setReindexing(false);
    }
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center space-x-2 pl-3 pr-4 py-1.5">
        <div className="mr-auto flex items-center space-x-1">
          <Button variant="ghost" size="icon-sm" onClick={onBack} aria-label="Back">
            <ArrowLeft />
          </Button>
          <div className="flex flex-col">
            <div className="ml-1 min-w-0 flex-1 truncate font-medium">{collection.name}</div>
            <div className="ml-1 min-w-0 flex-1 truncate text-xs text-muted-foreground">{collection.description}</div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground"
          onClick={onEdit}
          title="Edit collection"
        >
          <Pencil />
        </Button>
        {selectedCount > 0 ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground"
              disabled={reindexing}
              onClick={() => void handleReindexSelected()}
              title={`Re-index ${selectedCount} selected`}
              aria-label={`Re-index ${selectedCount} selected bookmarks`}
            >
              <RotateCcw className={reindexing ? "animate-spin" : undefined} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground"
              disabled={reindexing}
              onClick={() => onRequestRemoveSelected([...selectedIds])}
              title={`Remove ${selectedCount} selected`}
              aria-label={`Remove ${selectedCount} selected bookmarks`}
            >
              <Trash2 />
            </Button>
          </>
        ) : null}
        {n > 0 ? (
          <div className="flex shrink-0 items-center px-0.5" onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={headerChecked}
              onCheckedChange={(v) => {
                if (v === true) setSelectedIds(new Set(bookmarks.map((b) => b.id)));
                else setSelectedIds(new Set());
              }}
              aria-label="Select all bookmarks"
            />
          </div>
        ) : null}
      </div>
      <Separator />
      <ScrollArea className="px-2 py-2">
        {bookmarks.length === 0 ? (
          <div className="py-6">
            <Empty className="border-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Bookmark />
                </EmptyMedia>
                <EmptyTitle>No bookmarks yet</EmptyTitle>
                <EmptyDescription>
                  Add pages using the panel below.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : (
          <ItemGroup className="min-w-0">
            {bookmarks.map((b) => (
              <BookmarkItem
                key={b.id}
                bookmark={b}
                selected={selectedIds.has(b.id)}
                onSelectChange={(sel) => setSelected(b.id, sel)}
              />
            ))}
          </ItemGroup>
        )}
      </ScrollArea>
    </section>
  );
}