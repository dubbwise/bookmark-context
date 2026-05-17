import { ScrollArea } from "@/components/ui/scroll-area";
import CollectionItem from "./CollectionItem";
import type { Collection } from "../types";

interface CollectionListProps {
  collections: Collection[];
  searchQuery: string;
  onSelect: (c: Collection) => void;
  onRename: (c: Collection) => void;
  onDelete: (c: Collection) => void;
}

export default function CollectionList({ collections, searchQuery, onSelect, onRename, onDelete }: CollectionListProps) {
  const lower = searchQuery.toLowerCase();
  const visible = searchQuery
    ? collections.filter((c) => c.name.toLowerCase().includes(lower))
    : collections;

  return (
    <section className="flex-1 overflow-hidden">
      <ScrollArea className="h-full">
        <div className="px-2 py-2">
          {visible.length === 0 && (
            <p className="text-[12px] text-muted-foreground px-2 py-3">
              {searchQuery ? "No collections match your search." : "No collections yet."}
            </p>
          )}
          {visible.map((c) => (
            <CollectionItem
              key={c.id}
              collection={c}
              onSelect={() => onSelect(c)}
              onRename={() => onRename(c)}
              onDelete={() => onDelete(c)}
            />
          ))}
        </div>
      </ScrollArea>
    </section>
  );
}
