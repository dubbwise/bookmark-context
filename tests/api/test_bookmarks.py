import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock
from httpx import AsyncClient, ASGITransport
from bookmark_context.config import Config
from bookmark_context.api.app import create_app


@pytest.fixture
def config(tmp_path: Path):
    return Config(db_path=tmp_path / "test.db", chroma_path=tmp_path / "chroma")


@pytest.fixture
async def client(config):
    app = create_app(config)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


@pytest.fixture
async def collection_id(client):
    r = await client.post("/collections", json={"name": "Research", "description": ""})
    return r.json()["id"]


async def test_add_bookmark(client, collection_id):
    with patch("bookmark_context.api.bookmarks.IndexPipeline") as MockPipeline:
        MockPipeline.return_value.index_bookmark = MagicMock()
        response = await client.post(
            f"/collections/{collection_id}/bookmarks",
            json={"url": "https://example.com", "title": "Example"},
        )
    assert response.status_code == 201
    data = response.json()
    assert data["url"] == "https://example.com"
    assert data["index_status"] == "pending"


async def test_list_bookmarks(client, collection_id):
    with patch("bookmark_context.api.bookmarks.IndexPipeline"):
        await client.post(
            f"/collections/{collection_id}/bookmarks",
            json={"url": "https://example.com", "title": "Example"},
        )
    response = await client.get(f"/collections/{collection_id}/bookmarks")
    assert response.status_code == 200
    assert len(response.json()) == 1


async def test_delete_bookmark(client, collection_id):
    with patch("bookmark_context.api.bookmarks.IndexPipeline"):
        r = await client.post(
            f"/collections/{collection_id}/bookmarks",
            json={"url": "https://example.com", "title": "Example"},
        )
    bm_id = r.json()["id"]
    response = await client.delete(f"/bookmarks/{bm_id}")
    assert response.status_code == 204


async def test_add_duplicate_bookmark_returns_existing(client, collection_id):
    with patch("bookmark_context.api.bookmarks.IndexPipeline"):
        r1 = await client.post(
            f"/collections/{collection_id}/bookmarks",
            json={"url": "https://example.com", "title": "Example"},
        )
        r2 = await client.post(
            f"/collections/{collection_id}/bookmarks",
            json={"url": "https://example.com", "title": "Example"},
        )
    assert r1.json()["id"] == r2.json()["id"]
