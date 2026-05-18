from __future__ import annotations
from bookmark_context.storage.database import Database
from bookmark_context.storage.vector_store import VectorStore
from bookmark_context.indexer.embedder import Embedder
from bookmark_context.indexer.scraper import scrape_url, fetch_page_html, extract_favicon
from bookmark_context.indexer.chunker import chunk_text
from bookmark_context.indexer.scanner import scan_chunks


class IndexPipeline:
    def __init__(self, db: Database, vs: VectorStore, embedder: Embedder) -> None:
        self.db = db
        self.vs = vs
        self.embedder = embedder

    def index_bookmark(self, bookmark_id: str, html: str | None = None) -> None:
        bm = self.db.get_bookmark(bookmark_id)
        if not bm:
            return

        self.db.update_bookmark_status(bookmark_id, "indexing")
        try:
            raw_html = fetch_page_html(bm["url"], html=html)
            text = scrape_url(bm["url"], html=raw_html or html)
            if not text:
                self.db.update_bookmark_status(bookmark_id, "error", "No content extracted from page")
                return

            favicon_url = extract_favicon(raw_html, bm["url"]) if raw_html else bm.get("favicon_url", "")

            chunks = chunk_text(text)
            scan_results = scan_chunks(chunks)
            embeddings = self.embedder.embed(chunks)

            chroma_ids = [f"{bookmark_id}-{i}" for i in range(len(chunks))]
            metadatas = [
                {
                    "url": bm["url"],
                    "title": bm["title"],
                    "bookmark_id": bookmark_id,
                    "injection_risk": result.risk_score,
                    "injection_signals": ",".join(result.signals),
                }
                for result in scan_results
            ]
            self.vs.add_chunks(
                collection_id=bm["collection_id"],
                chroma_ids=chroma_ids,
                texts=chunks,
                embeddings=embeddings,
                metadatas=metadatas,
            )
            self.db.add_chunks(bookmark_id, list(zip(chunks, chroma_ids)))
            self.db.update_bookmark_status(bookmark_id, "done", favicon_url=favicon_url)
        except Exception as e:
            self.db.update_bookmark_status(bookmark_id, "error", str(e))
