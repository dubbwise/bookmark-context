from __future__ import annotations
from bookmark_context.storage.database import Database
from bookmark_context.storage.vector_store import VectorStore
from bookmark_context.indexer.embedder import Embedder
from bookmark_context.indexer.scraper import scrape_url
from bookmark_context.indexer.chunker import chunk_text


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
            text = scrape_url(bm["url"], html=html)
            if not text:
                self.db.update_bookmark_status(bookmark_id, "error", "No content extracted from page")
                return

            chunks = chunk_text(text)
            embeddings = self.embedder.embed(chunks)

            chroma_ids = [f"{bookmark_id}-{i}" for i in range(len(chunks))]
            metadatas = [
                {"url": bm["url"], "title": bm["title"], "bookmark_id": bookmark_id}
                for _ in chunks
            ]
            self.vs.add_chunks(
                collection_id=bm["collection_id"],
                chroma_ids=chroma_ids,
                texts=chunks,
                embeddings=embeddings,
                metadatas=metadatas,
            )
            self.db.add_chunks(bookmark_id, list(zip(chunks, chroma_ids)))
            self.db.update_bookmark_status(bookmark_id, "done")
        except Exception as e:
            self.db.update_bookmark_status(bookmark_id, "error", str(e))
