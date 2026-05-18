from __future__ import annotations
from fastapi import APIRouter, Request, HTTPException, BackgroundTasks, Query
from fastapi.responses import JSONResponse
from starlette.responses import Response
from bookmark_context.api.schemas import BookmarkCreate, BookmarkResponse, ScanWarning
from bookmark_context.indexer.pipeline import IndexPipeline
from bookmark_context.indexer.scraper import scrape_url, extract_favicon, is_spa_shell
from bookmark_context.indexer.chunker import chunk_text
from bookmark_context.indexer.scanner import scan_chunks

router = APIRouter(tags=["bookmarks"])


@router.get("/collections/{collection_id}/bookmarks", response_model=list[BookmarkResponse])
def list_bookmarks(collection_id: str, request: Request):
    return request.app.state.db.list_bookmarks(collection_id)


@router.post("/collections/{collection_id}/bookmarks")
def add_bookmark(
    collection_id: str,
    body: BookmarkCreate,
    request: Request,
    background_tasks: BackgroundTasks,
    force: bool = Query(default=False),
):
    db = request.app.state.db
    if not db.get_collection(collection_id):
        raise HTTPException(status_code=404, detail="Collection not found")

    if not force:
        text = scrape_url(body.url, html=body.html)
        if text and is_spa_shell(text):
            return JSONResponse(
                status_code=200,
                content=ScanWarning(
                    risk_score=0.5,
                    signals=["content_unscannable"],
                    matches=[
                        "Page looks JavaScript-rendered; could not extract real content to scan."
                    ],
                ).model_dump(),
            )
        if text:
            chunks = chunk_text(text)
            results = scan_chunks(chunks)
            risky = [r for r in results if r.risk_score > 0]
            if risky:
                max_risk = max(r.risk_score for r in risky)
                all_signals = sorted({s for r in risky for s in r.signals})
                all_matches = [m for r in risky for m in r.matches][:10]
                return JSONResponse(
                    status_code=200,
                    content=ScanWarning(
                        risk_score=max_risk,
                        signals=all_signals,
                        matches=all_matches,
                    ).model_dump(),
                )

    favicon_url = body.favicon_url
    if not favicon_url and body.html:
        favicon_url = extract_favicon(body.html, body.url)
    bm_id = db.add_bookmark(
        collection_id, body.url, body.title or body.url, favicon_url=favicon_url
    )
    pipeline = IndexPipeline(db=db, vs=request.app.state.vs, embedder=request.app.state.embedder)
    background_tasks.add_task(pipeline.index_bookmark, bm_id, body.html)
    bm = db.get_bookmark(bm_id)
    return JSONResponse(status_code=201, content=BookmarkResponse(**bm).model_dump())


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
