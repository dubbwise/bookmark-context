from __future__ import annotations
from fastapi import APIRouter, Request, HTTPException
from starlette.responses import Response
from bookmark_context.api.schemas import CollectionCreate, CollectionResponse

router = APIRouter(prefix="/collections", tags=["collections"])


@router.get("", response_model=list[CollectionResponse])
def list_collections(request: Request):
    return [CollectionResponse(**c) for c in request.app.state.db.list_collections()]


@router.post("", response_model=CollectionResponse, status_code=201)
def create_collection(body: CollectionCreate, request: Request):
    db = request.app.state.db
    coll_id = db.create_collection(body.name, body.description)
    coll = db.get_collection(coll_id)
    return CollectionResponse(**coll, bookmark_count=0)


@router.delete("/{collection_id}", status_code=204)
def delete_collection(collection_id: str, request: Request):
    db = request.app.state.db
    if not db.get_collection(collection_id):
        raise HTTPException(status_code=404, detail="Collection not found")
    vs = request.app.state.vs
    db.delete_collection(collection_id)
    vs.delete_collection(collection_id)
    return Response(status_code=204)
