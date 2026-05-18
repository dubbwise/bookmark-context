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

/** Hide badge once indexed; show while queued, in progress, or failed. */
function shouldShowIndexStatus(status: Bookmark["index_status"]): boolean {
  return status !== "done";
}

interface BookmarkItemProps {
  bookmark: Bookmark;
  selected: boolean;
  onSelectChange: (selected: boolean) => void;
}

export default function BookmarkItem({
  bookmark,
  selected,
  onSelectChange,
}: BookmarkItemProps) {
  return (
    <Item size="xs" variant="default" className="grid grid-cols-[auto_1fr_auto] items-start">
      <ItemMedia variant="image">
        <Favicon
          url={bookmark.url}
          faviconUrl={bookmark.favicon_url}
          className="size-full rounded-sm"
        />
      </ItemMedia>
      <ItemContent className="w-full">
        <div className="flex items-center justify-between space-x-2">
          <ItemTitle className="">{bookmark.title || bookmark.url}</ItemTitle>
          {shouldShowIndexStatus(bookmark.index_status) ? (
            <Badge
              variant={STATUS_VARIANT[bookmark.index_status]}
              className="shrink truncate"
            >
              {STATUS_LABELS[bookmark.index_status]}
            </Badge>
          ) : null}
        </div>
        <ItemDescription className="">
          <div className="overflow-hidden text-ellipsis line-clamp-1">
            <a
              href={bookmark.url}
              target="_blank"
              rel="noopener noreferrer"
              className="no-underline! hover:underline! hover:text-muted-foreground!"
              onClick={(e) => e.stopPropagation()}
            >
              {bookmark.url}
            </a>
          </div>
        </ItemDescription>
      </ItemContent>
      <ItemFooter>
        <ItemActions>
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={selected}
              onCheckedChange={(v) => onSelectChange(v === true)}
              aria-label={`Select ${bookmark.title || bookmark.url}`}
              className="bg-white"
            />
          </div>
        </ItemActions>
      </ItemFooter>
    </Item>
  );
}
