import { cn } from "@/lib/utils";

interface StatusBarProps {
  online: boolean | null;
  backend: string;
}

export default function StatusBar({ online, backend }: StatusBarProps) {
  return (
    <footer className="flex items-center gap-1.5 px-3 py-1.5 border-t border-border text-[11px] text-muted-foreground flex-shrink-0">
      <span
        className={cn(
          "w-2 h-2 rounded-full flex-shrink-0",
          online === true ? "bg-green-500" : "bg-red-500",
        )}
      />
      <span>
        {online === true ? `Online · ${backend}` : "Daemon offline"}
      </span>
    </footer>
  );
}
