export interface FaviconPreview {
  url: string;
  favicon_url: string;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  bookmark_count: number;
  favicon_previews?: FaviconPreview[];
}

export interface Bookmark {
  id: string;
  collection_id: string;
  url: string;
  title: string;
  favicon_url: string;
  added_at: string;
  indexed_at: string | null;
  index_status: "pending" | "indexing" | "done" | "error";
  error_message: string | null;
}

export interface ScanWarning {
  status: "scan_warning";
  risk_score: number;
  signals: string[];
  matches: string[];
}

export interface DaemonStatus {
  status: string;
  version: string;
}

export interface CurrentTab {
  title: string;
  url: string;
  faviconUrl?: string;
}
