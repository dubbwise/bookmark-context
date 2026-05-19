from __future__ import annotations
import sqlite3
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

from bookmark_context.favicon import favicon_key


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class Database:
    def __init__(self, path: Path) -> None:
        self.path = path

    def _connect(self) -> sqlite3.Connection:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(self.path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        return conn

    def init(self) -> None:
        with self._connect() as conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS collections (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT NOT NULL DEFAULT '',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS bookmarks (
                    id TEXT PRIMARY KEY,
                    collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
                    url TEXT NOT NULL,
                    title TEXT NOT NULL DEFAULT '',
                    favicon_url TEXT NOT NULL DEFAULT '',
                    added_at TEXT NOT NULL,
                    indexed_at TEXT,
                    index_status TEXT NOT NULL DEFAULT 'pending'
                        CHECK(index_status IN ('pending','indexing','done','error')),
                    error_message TEXT
                );
                CREATE UNIQUE INDEX IF NOT EXISTS idx_bookmarks_collection_url
                    ON bookmarks(collection_id, url);
                CREATE TABLE IF NOT EXISTS chunks (
                    id TEXT PRIMARY KEY,
                    bookmark_id TEXT NOT NULL REFERENCES bookmarks(id) ON DELETE CASCADE,
                    content TEXT NOT NULL,
                    chunk_index INTEGER NOT NULL,
                    chroma_id TEXT NOT NULL
                );
            """)

    def create_collection(self, name: str, description: str) -> str:
        coll_id = str(uuid.uuid4())
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO collections (id, name, description, created_at, updated_at) VALUES (?,?,?,?,?)",
                (coll_id, name, description, _now(), _now()),
            )
        return coll_id

    def list_collections(self) -> list[dict]:
        with self._connect() as conn:
            rows = conn.execute("""
                SELECT c.*, COUNT(b.id) AS bookmark_count
                FROM collections c
                LEFT JOIN bookmarks b ON b.collection_id = c.id
                GROUP BY c.id
                ORDER BY c.created_at
            """).fetchall()
        previews = self._favicon_previews_by_collection()
        result = []
        for row in rows:
            coll = dict(row)
            coll["favicon_previews"] = previews.get(coll["id"], [])
            result.append(coll)
        return result

    def _favicon_previews_by_collection(self) -> dict[str, list[dict]]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT collection_id, url, favicon_url FROM bookmarks"
            ).fetchall()
        stats: dict[str, dict[str, dict]] = defaultdict(dict)
        for row in rows:
            coll_id = row["collection_id"]
            url = row["url"]
            favicon_url = row["favicon_url"] or ""
            key = favicon_key(url, favicon_url)
            if not key:
                continue
            bucket = stats[coll_id]
            if key not in bucket:
                bucket[key] = {"count": 0, "url": url, "favicon_url": favicon_url}
            bucket[key]["count"] += 1
        result: dict[str, list[dict]] = {}
        for coll_id, by_key in stats.items():
            ordered = sorted(by_key.values(), key=lambda x: (-x["count"], x["url"]))
            result[coll_id] = [
                {"url": entry["url"], "favicon_url": entry["favicon_url"]}
                for entry in ordered
            ]
        return result

    def favicon_previews_for_collection(self, collection_id: str) -> list[dict]:
        return self._favicon_previews_by_collection().get(collection_id, [])

    def get_collection(self, coll_id: str) -> dict | None:
        with self._connect() as conn:
            row = conn.execute("SELECT * FROM collections WHERE id = ?", (coll_id,)).fetchone()
        return dict(row) if row else None

    def delete_collection(self, coll_id: str) -> None:
        with self._connect() as conn:
            conn.execute("DELETE FROM collections WHERE id = ?", (coll_id,))

    def update_collection(self, coll_id: str, name: str, description: str) -> None:
        with self._connect() as conn:
            conn.execute(
                "UPDATE collections SET name = ?, description = ?, updated_at = ? WHERE id = ?",
                (name, description, _now(), coll_id),
            )

    def add_bookmark(
        self, collection_id: str, url: str, title: str, favicon_url: str = ""
    ) -> str:
        with self._connect() as conn:
            existing = conn.execute(
                "SELECT id FROM bookmarks WHERE collection_id = ? AND url = ?",
                (collection_id, url),
            ).fetchone()
            if existing:
                return existing["id"]
            bm_id = str(uuid.uuid4())
            conn.execute(
                "INSERT INTO bookmarks (id, collection_id, url, title, favicon_url, added_at, index_status) VALUES (?,?,?,?,?,?,?)",
                (bm_id, collection_id, url, title, favicon_url, _now(), "pending"),
            )
        return bm_id

    def get_bookmark(self, bm_id: str) -> dict | None:
        with self._connect() as conn:
            row = conn.execute("SELECT * FROM bookmarks WHERE id = ?", (bm_id,)).fetchone()
        return dict(row) if row else None

    def list_bookmarks(self, collection_id: str) -> list[dict]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM bookmarks WHERE collection_id = ? ORDER BY added_at DESC",
                (collection_id,),
            ).fetchall()
        return [dict(r) for r in rows]

    def update_bookmark_status(
        self,
        bm_id: str,
        status: str,
        error_message: str | None = None,
        favicon_url: str | None = None,
    ) -> None:
        with self._connect() as conn:
            if status == "done":
                if favicon_url is not None:
                    conn.execute(
                        "UPDATE bookmarks SET index_status = ?, indexed_at = ?, error_message = NULL, favicon_url = ? WHERE id = ?",
                        (status, _now(), favicon_url, bm_id),
                    )
                else:
                    conn.execute(
                        "UPDATE bookmarks SET index_status = ?, indexed_at = ?, error_message = NULL WHERE id = ?",
                        (status, _now(), bm_id),
                    )
            else:
                conn.execute(
                    "UPDATE bookmarks SET index_status = ?, error_message = ? WHERE id = ?",
                    (status, error_message, bm_id),
                )

    def add_chunks(self, bookmark_id: str, chunks: list[tuple[str, str]]) -> None:
        with self._connect() as conn:
            conn.execute("DELETE FROM chunks WHERE bookmark_id = ?", (bookmark_id,))
            conn.executemany(
                "INSERT INTO chunks (id, bookmark_id, content, chunk_index, chroma_id) VALUES (?,?,?,?,?)",
                [(str(uuid.uuid4()), bookmark_id, text, i, chroma_id) for i, (text, chroma_id) in enumerate(chunks)],
            )

    def get_chunks_for_bookmark(self, bookmark_id: str) -> list[dict]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM chunks WHERE bookmark_id = ? ORDER BY chunk_index",
                (bookmark_id,),
            ).fetchall()
        return [dict(r) for r in rows]

    def delete_bookmark(self, bm_id: str) -> None:
        with self._connect() as conn:
            conn.execute("DELETE FROM bookmarks WHERE id = ?", (bm_id,))
