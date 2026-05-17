import { Separator } from "@/components/ui/separator";

interface HeaderProps {
  onNewCollection: () => void;
}

export default function Header({ onNewCollection: _ }: HeaderProps) {
  return (
    <>
      <header className="flex items-center justify-between px-3 py-2.5 bg-primary/10 flex-shrink-0">
        <span className="font-semibold text-sm">📚 Bookmark Context</span>
        <a
          href="../options/options.html"
          target="_blank"
          title="Settings"
          className="text-muted-foreground hover:text-foreground text-base leading-none"
        >
          ⚙
        </a>
      </header>
      <Separator />
    </>
  );
}
