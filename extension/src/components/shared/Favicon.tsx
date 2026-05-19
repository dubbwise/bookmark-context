import { useEffect, useMemo, useState } from "react";
import { Globe } from "lucide-react";
import { getFaviconCandidates } from "@/lib/favicon";
import { cn } from "@/lib/utils";

interface FaviconProps {
  url: string;
  faviconUrl?: string;
  className?: string;
}

export function Favicon({ url, faviconUrl = "", className }: FaviconProps) {
  const candidates = useMemo(() => getFaviconCandidates(url, faviconUrl), [url, faviconUrl]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [url, faviconUrl]);

  const src = candidates[index];
  if (!src || index >= candidates.length) {
    return (
      <div
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-sm bg-muted",
          className,
        )}
        aria-hidden
      >
        <Globe className="size-2.5 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      className={cn("size-4 shrink-0 rounded-sm object-contain", className)}
      loading="lazy"
      onError={() => setIndex((i) => i + 1)}
    />
  );
}
