import { getFaviconKey } from "@/lib/favicon";
import type { Bookmark, FaviconPreview } from "@/types";

export function rankFaviconPreviews(bookmarks: Bookmark[]): FaviconPreview[] {
  const byKey = new Map<string, { count: number; preview: FaviconPreview }>();

  for (const bookmark of bookmarks) {
    const key = getFaviconKey(bookmark.url, bookmark.favicon_url);
    if (!key) continue;

    const existing = byKey.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      byKey.set(key, {
        count: 1,
        preview: { url: bookmark.url, favicon_url: bookmark.favicon_url },
      });
    }
  }

  return [...byKey.values()]
    .sort((a, b) => b.count - a.count || a.preview.url.localeCompare(b.preview.url))
    .map(({ preview }) => preview);
}
