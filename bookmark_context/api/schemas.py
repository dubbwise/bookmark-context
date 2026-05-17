from __future__ import annotations
from pydantic import BaseModel, Field


class CollectionCreate(BaseModel):
    name: str = Field(min_length=1)
    description: str = ""


class CollectionUpdate(BaseModel):
    name: str = Field(min_length=1)
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


class ScanWarning(BaseModel):
    status: str = "scan_warning"
    risk_score: float
    signals: list[str]
    matches: list[str]


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
