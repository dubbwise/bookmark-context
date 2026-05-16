import pytest
from pathlib import Path
from httpx import AsyncClient, ASGITransport
from bookmark_context.config import Config
from bookmark_context.api.app import create_app


@pytest.fixture
def config(tmp_path: Path):
    return Config(
        db_path=tmp_path / "test.db",
        chroma_path=tmp_path / "chroma",
    )


@pytest.fixture
async def client(config):
    app = create_app(config)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


async def test_status_returns_ok(client):
    response = await client.get("/status")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data
