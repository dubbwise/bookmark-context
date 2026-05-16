from __future__ import annotations
from fastapi import APIRouter, Request, HTTPException, BackgroundTasks
from starlette.responses import Response
from bookmark_context.api.schemas import BookmarkCreate, BookmarkResponse
from bookmark_context.indexer.pipeline import IndexPipeline

router = APIRouter(tags=["bookmarks"])


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
