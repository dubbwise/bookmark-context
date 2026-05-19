import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StatusBarProps {
  online: boolean | null;
  backend: string;
  onOpenThemeDemo: () => void;
}

export default function StatusBar({ online, backend, onOpenThemeDemo }: StatusBarProps) {
  return (
    <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-3 py-1.5 text-[11px] text-muted-foreground">
      <div className="flex min-w-0 items-center gap-1.5">
        <span
          className={cn(
            "size-2 shrink-0 rounded-full",
            online === true ? "bg-green-600" : online === false ? "bg-destructive" : "bg-muted",
          )}
        />
        <span className="truncate">
          {online === true ? `Online · ${backend}` : "Daemon offline"}
        </span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="size-6 shrink-0 text-muted-foreground"
        onClick={onOpenThemeDemo}
        title="Theme demo"
      >
        <Palette className="size-3.5" />
      </Button>
    </footer>
  );
}
