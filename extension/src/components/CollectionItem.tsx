import { Album, MoreVertical, Pencil } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import type { Collection } from "../types";

interface CollectionItemProps {
  collection: Collection;
  onSelect: () => void;
  onEdit: () => void;
}

export default function CollectionItem({
  collection,
  onSelect,
  onEdit,
}: CollectionItemProps) {
  return (
    <Item
      size="xs"
      variant="default"
      className="min-w-0 cursor-pointer hover:bg-accent"
      onClick={onSelect}
    >
      <ItemMedia variant="icon">
        <Album />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{collection.name}</ItemTitle>
        {collection.description ? (
          <ItemDescription className="truncate">{collection.description}</ItemDescription>
        ) : null}
      </ItemContent>
      <ItemActions
        className="shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-xs text-muted-foreground tabular-nums">
          {collection.bookmark_count} pages
        </span>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="opacity-0 group-hover/item:opacity-100 data-[state=open]:opacity-100"
              aria-label="Options"
            >
              <MoreVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuGroup>
              <DropdownMenuItem onSelect={onEdit}>
                <Pencil />
                Edit collection
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </ItemActions>
    </Item>
  );
}
