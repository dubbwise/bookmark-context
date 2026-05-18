import { BookmarkCheck, Plus, RefreshCw, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reloadSidePanel } from "@/lib/reloadPanel";

interface HeaderProps {
  onNewCollection: () => void;
  onSettings: () => void;
  searchOpen: boolean;
  onSearchToggle: () => void;
  showSearch?: boolean;
}

export default function Header({
  onNewCollection,
  onSettings,
  searchOpen,
  onSearchToggle,
  showSearch = true,
}: HeaderProps) {
  return (
    <>
      <header className="flex min-w-0 shrink-0 items-center justify-between gap-2 bg-accent px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <BookmarkCheck />
          <span className="text-sm font-medium">Bookmark context</span>
        </div>
        <div className="flex shrink-0 items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={onNewCollection}
            title="New collection"
          >
            <Plus data-icon="inline-start" />
            New
          </Button>
          {/* {showSearch && (
            <Button
              variant="ghost"
              size="icon-sm"
              className={cn("text-muted-foreground", searchOpen && "bg-accent text-foreground")}
              onClick={onSearchToggle}
              title="Search collections"
              aria-pressed={searchOpen}
            >
              <Search />
            </Button>
          )} */}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground"
            onClick={reloadSidePanel}
            title="Reload extension"
          >
            <RefreshCw />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground"
            onClick={onSettings}
            title="Settings"
          >
            <Settings2 />
          </Button>
        </div>
      </header>
    </>
  );
}
