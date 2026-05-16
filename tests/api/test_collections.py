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
