import { describe, it, expect } from "vitest";
import { rankFaviconPreviews } from "./collectionFavicons";
import type { Bookmark } from "@/types";

function bookmark(
  url: string,
  favicon_url: string,
  id = url,
): Bookmark {
  return {
    id,
    collection_id: "c1",
    url,
    title: url,
    favicon_url,
    added_at: "",
    indexed_at: null,
    index_status: "done",
    error_message: null,
  };
}

describe("rankFaviconPreviews", () => {
  it("dedupes by favicon and orders by count descending", () => {
    const previews = rankFaviconPreviews([
      bookmark("https://a.com/1", "https://a.com/favicon.ico", "1"),
      bookmark("https://a.com/2", "https://a.com/favicon.ico", "2"),
      bookmark("https://b.com/1", "https://b.com/favicon.ico", "3"),
    ]);
    expect(previews.map((p) => p.favicon_url)).toEqual([
      "https://a.com/favicon.ico",
      "https://b.com/favicon.ico",
    ]);
  });
});
