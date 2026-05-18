import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../shared/api.js", () => ({
  api: {
    status: vi.fn(),
    listCollections: vi.fn(),
    createCollection: vi.fn(),
    deleteCollection: vi.fn(),
    updateCollection: vi.fn(),
    listBookmarks: vi.fn(),
    addBookmark: vi.fn(),
    deleteBookmark: vi.fn(),
    reindexBookmark: vi.fn(),
  },
}));

import { api } from "./api";
import { api as rawApi } from "../shared/api.js";

describe("typed api wrapper", () => {
  beforeEach(() => vi.clearAllMocks());

  it("status() delegates to rawApi.status()", async () => {
    (rawApi.status as ReturnType<typeof vi.fn>).mockResolvedValue({ status: "ok", version: "0.1.0" });
    const result = await api.status();
    expect(result.version).toBe("0.1.0");
  });

  it("listCollections() returns typed Collection[]", async () => {
    const mockColl = { id: "1", name: "A", description: "", created_at: "", updated_at: "", bookmark_count: 0 };
    (rawApi.listCollections as ReturnType<typeof vi.fn>).mockResolvedValue([mockColl]);
    const result = await api.listCollections();
    expect(result[0].name).toBe("A");
  });

  it("addBookmark() passes force flag when true", async () => {
    (rawApi.addBookmark as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "b1", index_status: "pending" });
    await api.addBookmark("c1", "https://example.com", "Title", null, true);
    expect(rawApi.addBookmark).toHaveBeenCalledWith(
      "c1",
      "https://example.com",
      "Title",
      null,
      true,
      "",
    );
  });
});
