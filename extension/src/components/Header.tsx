import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface HeaderProps {
  onNewCollection: () => void;
}

export default function Header({ onNewCollection }: HeaderProps) {
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
          <a
            href="../options/options.html"
            target="_blank"
            title="Settings"
            className="text-muted-foreground hover:text-foreground text-base leading-none px-1"
          >
            ⚙
          </a>
        </div>
      </header>
      <Separator />
    </>
  );
}
