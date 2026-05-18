import { cn } from "@/lib/utils";

interface StatusBarProps {
  online: boolean | null;
  backend: string;
}

export default function StatusBar({ online, backend }: StatusBarProps) {
  return (
    <footer className="flex shrink-0 items-center gap-1.5 border-t border-border px-3 py-1.5 text-[11px] text-muted-foreground">
      <span
        className={cn(
          "size-2 shrink-0 rounded-full",
          online === true ? "bg-primary" : online === false ? "bg-destructive" : "bg-muted",
        )}
      />
      <span>
        {online === true ? `Online · ${backend}` : "Daemon offline"}
      </span>
    </footer>
  );
}
