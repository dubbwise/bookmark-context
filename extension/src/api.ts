import { api as rawApi } from "../shared/api.js";
import type { Collection, Bookmark, ScanWarning, DaemonStatus } from "./types";

export const api = {
  status: () => rawApi.status() as Promise<DaemonStatus>,
  listCollections: () => rawApi.listCollections() as Promise<Collection[]>,
  createCollection: (name: string, description = "") =>
    rawApi.createCollection(name, description) as Promise<Collection>,
  deleteCollection: (id: string) => rawApi.deleteCollection(id) as Promise<null>,
  updateCollection: (id: string, name: string, description = "") =>
    rawApi.updateCollection(id, name, description) as Promise<Collection>,
  listBookmarks: (collectionId: string) =>
    rawApi.listBookmarks(collectionId) as Promise<Bookmark[]>,
  addBookmark: (
    collectionId: string,
    url: string,
    title: string,
    html: string | null = null,
    force = false,
  ) => rawApi.addBookmark(collectionId, url, title, html, force) as Promise<Bookmark | ScanWarning>,
  deleteBookmark: (id: string) => rawApi.deleteBookmark(id) as Promise<null>,
  reindexBookmark: (id: string) => rawApi.reindexBookmark(id) as Promise<null>,
};
