import { Folder, MoreVertical, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { Collection } from "../types";

interface CollectionItemProps {
  collection: Collection;
  onSelect: () => void;
  onRename: () => void;
  onDelete: () => void;
}

export default function CollectionItem({ collection, onSelect, onRename, onDelete }: CollectionItemProps) {
  return (
    <div className="flex items-center rounded-md px-2 py-1.5 mb-0.5 cursor-pointer hover:bg-accent group">
      <div className="flex-1 min-w-0" onClick={onSelect}>
        <span className="text-sm font-medium truncate flex items-center gap-2">
          <Folder className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="font-semibold text-sm truncate">{collection.name}</span>
        </span>
      </div>
      <span className="text-[11px] text-muted-foreground mr-1 flex-shrink-0">
        {collection.bookmark_count} pages
      </span>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
            aria-label="Options"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onSelect={onRename}>
            <Pencil className="h-3.5 w-3.5" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

