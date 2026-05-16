from __future__ import annotations
from pydantic import BaseModel


class CollectionCreate(BaseModel):
    name: str
    description: str = ""


class CollectionResponse(BaseModel):
    id: str
    name: str
    description: str
    created_at: str
    updated_at: str
    bookmark_count: int = 0


class BookmarkCreate(BaseModel):
    url: str
    title: str = ""
    html: str | None = None


class BookmarkResponse(BaseModel):
    id: str
    collection_id: str
    url: str
    title: str
    favicon_url: str = ""
    added_at: str
    indexed_at: str | None
    index_status: str
    error_message: str | None = None


class AskRequest(BaseModel):
    question: str


class AskResponse(BaseModel):
    answer: str
    sources: list[dict]
