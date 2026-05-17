import type { Collection } from "../types";
export default function CurrentPage(_: { currentTab: { title: string; url: string } | null; collections: Collection[]; onAdd: (collectionId: string, html: string | null) => Promise<void> }) {
  return null;
}
