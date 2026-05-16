from __future__ import annotations
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from bookmark_context.config import Config
from bookmark_context.storage.database import Database
from bookmark_context.storage.vector_store import VectorStore
from bookmark_context.indexer.embedder import Embedder


VERSION = "0.1.0"


def create_app(config: Config) -> FastAPI:
    db = Database(config.db_path)
    db.init()
    vs = VectorStore(config.chroma_path)
    embedder = Embedder(config.embed_model)

    app = FastAPI(title="bookmark-context")
    app.state.db = db
    app.state.vs = vs
    app.state.embedder = embedder
    app.state.config = config

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/status")
    def status():
        return {"status": "ok", "version": VERSION}

    from bookmark_context.api.collections import router as collections_router
    from bookmark_context.api.bookmarks import router as bookmarks_router
    app.include_router(collections_router)
    app.include_router(bookmarks_router)

    return app
