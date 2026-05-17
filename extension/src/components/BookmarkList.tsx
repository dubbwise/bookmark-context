import type { Collection, Bookmark } from "../types";
export default function BookmarkList(_: { collection: Collection; bookmarks: Bookmark[]; onBack: () => void; onRename: () => void; onDelete: () => void; onDeleteBookmark: (id: string) => void; onReindex: (id: string) => void }) {
  return null;
}
