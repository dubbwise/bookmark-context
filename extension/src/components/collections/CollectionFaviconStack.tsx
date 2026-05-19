import { Album } from "lucide-react";
import { Favicon } from "@/components/shared/Favicon";
import { getFaviconKey } from "@/lib/favicon";
import { cn } from "@/lib/utils";
import type { FaviconPreview } from "@/types";

const MAX_VISIBLE = 4;

interface CollectionFaviconStackProps {
  previews?: FaviconPreview[];
  className?: string;
}

export default function CollectionFaviconStack({
  previews = [],
  className,
}: CollectionFaviconStackProps) {
  const visible = previews.slice(0, MAX_VISIBLE);

  if (visible.length === 0) {
    return <Album className={cn("size-4 text-muted-foreground", className)} />;
  }

  return (
    <div className={cn("flex items-center -space-x-1", className)}>
      {visible.map((preview) => (
        <Favicon
          key={getFaviconKey(preview.url, preview.favicon_url)}
          url={preview.url}
          faviconUrl={preview.favicon_url}
          className="size-5 ring-2 ring-background"
        />
      ))}
    </div>
  );
}
