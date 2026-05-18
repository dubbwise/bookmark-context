import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Favicon } from "@/components/Favicon";
import type { Bookmark } from "../types";

const STATUS_LABELS: Record<Bookmark["index_status"], string> = {
  done: "Indexed",
  pending: "Pending",
  indexing: "Indexing",
  error: "Error",
};

const STATUS_VARIANT: Record<
  Bookmark["index_status"],
  "secondary" | "outline" | "destructive"
> = {
  done: "secondary",
  pending: "outline",
  indexing: "outline",
  error: "destructive",
};

interface BookmarkItemProps {
  bookmark: Bookmark;
  selected: boolean;
  onSelectChange: (selected: boolean) => void;
  onReindex: () => void;
}

export default function BookmarkItem({
  bookmark,
  selected,
  onSelectChange,
  onReindex,
}: BookmarkItemProps) {
  return (
    <Item size="xs" variant="default" className="grid grid-cols-[auto_1fr_auto]">
      <ItemMedia variant="image">
        <Favicon
          url={bookmark.url}
          faviconUrl={bookmark.favicon_url}
          className="size-full rounded-sm"
        />
      </ItemMedia>
      <ItemContent className="w-full">
        <div className="flex items-center space-x-2">
          <ItemTitle className="">{bookmark.title || bookmark.url}</ItemTitle>
          <Badge
            variant={STATUS_VARIANT[bookmark.index_status]}
            className="max-w-[calc(100%-4rem)] shrink truncate"
          >
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground"
              onClick={onReindex}
              title="Re-index"
            >
              <RotateCcw />
            </Button>
            {STATUS_LABELS[bookmark.index_status]}
          </Badge>
        </div>
        <ItemDescription className="truncate text-ellipsis">{bookmark.url}</ItemDescription>
      </ItemContent>
      <ItemFooter>
        <ItemActions className="gap-1">
          <div className="flex items-center px-0.5" onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={selected}
              onCheckedChange={(v) => onSelectChange(v === true)}
              aria-label={`Select ${bookmark.title || bookmark.url}`}
            />
          </div>
        </ItemActions>
      </ItemFooter>
    </Item>
  );
}
