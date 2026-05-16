from __future__ import annotations
from fastapi import APIRouter, Request, HTTPException, BackgroundTasks
from starlette.responses import Response
from bookmark_context.api.schemas import BookmarkCreate, BookmarkResponse, AskRequest, AskResponse
from bookmark_context.indexer.pipeline import IndexPipeline
from bookmark_context.rag import ask_collection
from bookmark_context.config import Config
from bookmark_context.ai.base import AIAdapter

router = APIRouter(tags=["bookmarks"])


def _get_ai_adapter(config: Config) -> AIAdapter:
    if config.ai_backend == "ollama":
        from bookmark_context.ai.ollama import OllamaAdapter
        return OllamaAdapter(base_url=config.ollama_base_url, model=config.ollama_chat_model)
    from bookmark_context.ai.claude import ClaudeAdapter
    return ClaudeAdapter(api_key=config.claude_api_key, model=config.claude_chat_model)


@router.get("/collections/{collection_id}/bookmarks", response_model=list[BookmarkResponse])
def list_bookmarks(collection_id: str, request: Request):
    return request.app.state.db.list_bookmarks(collection_id)


@router.post("/collections/{collection_id}/bookmarks", response_model=BookmarkResponse, status_code=201)
def add_bookmark(collection_id: str, body: BookmarkCreate, request: Request, background_tasks: BackgroundTasks):
    db = request.app.state.db
    if not db.get_collection(collection_id):
        raise HTTPException(status_code=404, detail="Collection not found")
    bm_id = db.add_bookmark(collection_id, body.url, body.title or body.url)
    pipeline = IndexPipeline(db=db, vs=request.app.state.vs, embedder=request.app.state.embedder)
    background_tasks.add_task(pipeline.index_bookmark, bm_id, body.html)
    return db.get_bookmark(bm_id)


@router.delete("/bookmarks/{bookmark_id}", status_code=204)
def delete_bookmark(bookmark_id: str, request: Request):
    db = request.app.state.db
    bm = db.get_bookmark(bookmark_id)
    if not bm:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    request.app.state.vs.delete_bookmark_chunks(bm["collection_id"], bookmark_id)
    db.delete_bookmark(bookmark_id)
    return Response(status_code=204)


@router.post("/bookmarks/{bookmark_id}/reindex", response_model=BookmarkResponse)
def reindex_bookmark(bookmark_id: str, request: Request, background_tasks: BackgroundTasks):
    db = request.app.state.db
    bm = db.get_bookmark(bookmark_id)
    if not bm:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    pipeline = IndexPipeline(db=db, vs=request.app.state.vs, embedder=request.app.state.embedder)
    db.update_bookmark_status(bookmark_id, "pending")
    background_tasks.add_task(pipeline.index_bookmark, bookmark_id)
    return db.get_bookmark(bookmark_id)


@router.post("/collections/{collection_id}/ask", response_model=AskResponse)
def ask(collection_id: str, body: AskRequest, request: Request):
    config: Config = request.app.state.config
    result = ask_collection(
        collection_id=collection_id,
        question=body.question,
        embedder=request.app.state.embedder,
        vs=request.app.state.vs,
        ai=_get_ai_adapter(config),
    )
    return result
