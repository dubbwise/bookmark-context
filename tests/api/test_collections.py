import pytest
from pathlib import Path
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


async def test_create_collection(client):
    response = await client.post("/collections", json={"name": "AI Research", "description": "Papers"})
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "AI Research"
    assert "id" in data


async def test_list_collections_empty(client):
    response = await client.get("/collections")
    assert response.status_code == 200
    assert response.json() == []


async def test_list_collections_with_data(client):
    await client.post("/collections", json={"name": "Research", "description": ""})
    await client.post("/collections", json={"name": "TypeScript", "description": ""})
    response = await client.get("/collections")
    assert len(response.json()) == 2


async def test_delete_collection(client):
    r = await client.post("/collections", json={"name": "Temp", "description": ""})
    coll_id = r.json()["id"]
    response = await client.delete(f"/collections/{coll_id}")
    assert response.status_code == 204
    assert (await client.get("/collections")).json() == []


async def test_delete_nonexistent_collection_returns_404(client):
    response = await client.delete("/collections/does-not-exist")
    assert response.status_code == 404


async def test_rename_collection_returns_updated_fields(client):
    r = await client.post("/collections", json={"name": "Old", "description": "old"})
    coll_id = r.json()["id"]
    response = await client.patch(f"/collections/{coll_id}", json={"name": "New", "description": "new"})
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "New"
    assert data["description"] == "new"
    assert data["id"] == coll_id


async def test_rename_collection_returns_404_for_missing(client):
    response = await client.patch("/collections/does-not-exist", json={"name": "X"})
    assert response.status_code == 404


async def test_rename_collection_includes_bookmark_count(client):
    r = await client.post("/collections", json={"name": "Coll", "description": ""})
    coll_id = r.json()["id"]
    response = await client.patch(f"/collections/{coll_id}", json={"name": "Renamed"})
    assert response.status_code == 200
    assert response.json()["bookmark_count"] == 0


async def test_list_collections_includes_ordered_favicon_previews(client):
    r = await client.post("/collections", json={"name": "Research", "description": ""})
    coll_id = r.json()["id"]
    await client.post(
        f"/collections/{coll_id}/bookmarks",
        json={"url": "https://a.com/1", "title": "A1", "favicon_url": "https://a.com/favicon.ico"},
    )
    await client.post(
        f"/collections/{coll_id}/bookmarks",
        json={"url": "https://a.com/2", "title": "A2", "favicon_url": "https://a.com/favicon.ico"},
    )
    await client.post(
        f"/collections/{coll_id}/bookmarks",
        json={"url": "https://b.com/1", "title": "B1", "favicon_url": "https://b.com/favicon.ico"},
    )
    response = await client.get("/collections")
    previews = response.json()[0]["favicon_previews"]
    assert [p["favicon_url"] for p in previews] == [
        "https://a.com/favicon.ico",
        "https://b.com/favicon.ico",
    ]
