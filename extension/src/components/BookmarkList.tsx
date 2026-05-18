import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Bookmark, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
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
  onDeleteBookmarks: (ids: string[]) => void | Promise<void>;
  onReindex: (id: string) => void;
}

export default function BookmarkList({
  collection,
  bookmarks,
  onBack,
  onEdit,
  onDeleteBookmarks,
  onReindex,
}: BookmarkListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    const valid = new Set(bookmarks.map((b) => b.id));
    setSelectedIds((prev) => new Set([...prev].filter((id) => valid.has(id))));
  }, [bookmarks]);

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

  async function handleConfirmRemoveSelected() {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setRemoving(true);
    try {
      await onDeleteBookmarks(ids);
      setSelectedIds(new Set());
      setConfirmRemoveOpen(false);
    } catch {
      /* parent toasts on failure */
    } finally {
      setRemoving(false);
    }
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-1 px-2 py-1.5">
        <Button variant="ghost" size="icon-sm" onClick={onBack} aria-label="Back">
          <ArrowLeft />
        </Button>
        <span className="ml-1 min-w-0 flex-1 truncate text-lg font-semibold">{collection.name}</span>
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
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => setConfirmRemoveOpen(true)}
            title={`Remove ${selectedCount} selected`}
            aria-label={`Remove ${selectedCount} selected bookmarks`}
          >
            <Trash2 />
          </Button>
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
                onReindex={() => onReindex(b.id)}
              />
            ))}
          </ItemGroup>
        )}
      </ScrollArea>
      <Dialog open={confirmRemoveOpen} onOpenChange={setConfirmRemoveOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Remove selected bookmarks?</DialogTitle>
            <DialogDescription>
              Permanently remove {selectedCount} saved page{selectedCount === 1 ? "" : "s"} from{" "}
              <span className="font-medium text-foreground">{collection.name}</span>. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmRemoveOpen(false)} disabled={removing}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={removing}
              onClick={() => void handleConfirmRemoveSelected()}
            >
              {removing && <Spinner data-icon="inline-start" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
