import { RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Bookmark } from "../types";

const STATUS_LABELS: Record<Bookmark["index_status"], string> = {
  done: "Indexed",
  pending: "Pending",
  indexing: "Indexing",
  error: "Error",
};

const STATUS_CLASSES: Record<Bookmark["index_status"], string> = {
  done: "bg-green-500/15 text-green-400 border-green-500/20",
  pending: "bg-primary/15 text-primary border-primary/20",
  indexing: "bg-primary/15 text-primary border-primary/20",
  error: "bg-destructive/15 text-destructive border-destructive/20",
};

interface BookmarkItemProps {
  bookmark: Bookmark;
  onDelete: () => void;
  onReindex: () => void;
}

export default function BookmarkItem({ bookmark, onDelete, onReindex }: BookmarkItemProps) {
  return (
    <div className="px-2 py-2 rounded-md mb-1 bg-card border border-border">
      <p className="text-sm font-medium truncate">{bookmark.title || bookmark.url}</p>
      <p className="text-[11px] text-muted-foreground truncate mt-0.5">{bookmark.url}</p>
      <div className="flex items-center gap-2 mt-1.5">
        <Badge variant="outline" className={cn("text-[10px] font-semibold px-1.5 py-0", STATUS_CLASSES[bookmark.index_status])}>
          {STATUS_LABELS[bookmark.index_status]}
        </Badge>
        <div className="flex gap-1 ml-auto">
          <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground" onClick={onReindex} title="Re-index">
            <RotateCcw className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-destructive" onClick={onDelete} title="Remove">
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
