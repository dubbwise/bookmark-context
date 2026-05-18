import { FolderOpen } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ItemGroup } from "@/components/ui/item";
import CollectionItem from "./CollectionItem";
import type { Collection } from "../types";

interface CollectionListProps {
  collections: Collection[];
  searchQuery: string;
  onSelect: (c: Collection) => void;
  onEdit: (c: Collection) => void;
}

export default function CollectionList({
  collections,
  searchQuery,
  onSelect,
  onEdit,
}: CollectionListProps) {
  const trimmedQuery = searchQuery.trim();
  const lower = trimmedQuery.toLowerCase();
  const visible = trimmedQuery
    ? collections.filter((c) => c.name.toLowerCase().includes(lower))
    : collections;

  return (
    <section className="min-w-0 flex-1 overflow-hidden">
      <ScrollArea className="h-full min-w-0">
        <div className="min-w-0 px-2 py-2">
          {visible.length === 0 ? (
            <div className="py-6">
              <Empty className="border-0">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <FolderOpen />
                  </EmptyMedia>
                  <EmptyTitle>
                    {trimmedQuery ? "No matches" : "No collections yet"}
                  </EmptyTitle>
                  <EmptyDescription>
                    {trimmedQuery
                      ? "No collections match your search."
                      : "Create a collection to start saving pages."}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </div>
          ) : (
            <ItemGroup className="min-w-0">
              {visible.map((c) => (
                <CollectionItem
                  key={c.id}
                  collection={c}
                  onSelect={() => onSelect(c)}
                  onEdit={() => onEdit(c)}
                />
              ))}
            </ItemGroup>
          )}
        </div>
      </ScrollArea>
    </section>
  );
}
