import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface HeaderProps {
  onNewCollection: () => void;
  onSettings: () => void;
}

export default function Header({ onNewCollection, onSettings }: HeaderProps) {
  return (
    <>
      <header className="flex items-center justify-between px-3 py-2.5 bg-primary/10 flex-shrink-0">
        <span className="font-semibold text-sm">📚 Bookmark Context</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs px-2"
            onClick={onNewCollection}
          >
            + New
          </Button>
          <button
            onClick={onSettings}
            title="Settings"
            className="text-muted-foreground hover:text-foreground text-base leading-none px-1 cursor-pointer bg-transparent border-0"
          >
            ⚙
          </button>
        </div>
      </header>
      <Separator />
    </>
  );
}
