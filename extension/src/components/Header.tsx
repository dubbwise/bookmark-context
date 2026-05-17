import { FolderBookmark, Plus, RefreshCw, Search, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
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
      <header className="flex items-center justify-between px-3 py-2.5 bg-primary/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <FolderBookmark className="h-6 w-6 shrink-0" aria-hidden />
          <span className="font-semibold text-sm">Bookmark context</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs px-2 text-muted-foreground"
            onClick={onNewCollection}
            title="New collection"
          >
            <Plus className="h-3.5 w-3.5" />
            New
          </Button>
          {showSearch && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-7 w-7 text-muted-foreground",
                searchOpen && "bg-accent text-foreground",
              )}
              onClick={onSearchToggle}
              title="Search collections"
              aria-pressed={searchOpen}
            >
              <Search className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            onClick={reloadSidePanel}
            title="Reload extension"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            onClick={onSettings}
            title="Settings"
          >
            <Settings2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>
      <Separator />
    </>
  );
}
