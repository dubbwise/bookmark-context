import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import BookmarkItem from "./BookmarkItem";
import type { Collection, Bookmark } from "../types";

interface BookmarkListProps {
  collection: Collection;
  bookmarks: Bookmark[];
  onBack: () => void;
  onRename: () => void;
  onDelete: () => void;
  onDeleteBookmark: (id: string) => void;
  onReindex: (id: string) => void;
}

export default function BookmarkList({ collection, bookmarks, onBack, onRename, onDelete, onDeleteBookmark, onReindex }: BookmarkListProps) {
  return (
    <section className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center gap-1 px-2 py-1.5 flex-shrink-0">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onBack} aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="flex-1 font-semibold text-sm truncate ml-1">{collection.name}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={onRename} title="Rename collection">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={onDelete} title="Delete collection">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <Separator />
      <ScrollArea className="flex-1">
        <div className="px-2 py-2">
          {bookmarks.length === 0 ? (
            <p className="text-[12px] text-muted-foreground px-2 py-3">
              No bookmarks yet. Add pages using the panel below.
            </p>
          ) : (
            bookmarks.map((b) => (
              <BookmarkItem
                key={b.id}
                bookmark={b}
                onDelete={() => onDeleteBookmark(b.id)}
                onReindex={() => onReindex(b.id)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </section>
  );
}
