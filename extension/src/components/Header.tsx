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
        <div className="flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-folder-bookmark-icon lucide-folder-bookmark"><path d="M12 6v8l3-3 3 3V6"/><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/></svg>
          <span className="font-semibold text-sm">Bookmark Context</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs px-2"
            onClick={onNewCollection}
          >
            + Newww
          </Button>
          <button
            onClick={onSettings}
            title="Settings"
            className="text-muted-foreground hover:text-foreground text-base leading-none px-1 cursor-pointer bg-transparent border-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-settings2-icon lucide-settings-2"><path d="M14 17H5"/><path d="M19 7h-9"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></svg>
          </button>
        </div>
      </header>
      <Separator />
    </>
  );
}
