import pytest
from pathlib import Path
from bookmark_context.storage.database import Database


@pytest.fixture
def db(tmp_path: Path):
    d = Database(tmp_path / "test.db")
    d.init()
    return d


def test_create_and_list_collection(db: Database):
    coll_id = db.create_collection("AI Research", "Papers and blog posts")
    colls = db.list_collections()
    assert len(colls) == 1
    assert colls[0]["name"] == "AI Research"
    assert colls[0]["id"] == coll_id


def test_delete_collection(db: Database):
    coll_id = db.create_collection("Temp", "")
    db.delete_collection(coll_id)
    assert db.list_collections() == []


def test_add_and_list_bookmarks(db: Database):
    coll_id = db.create_collection("Research", "")
    bm_id = db.add_bookmark(coll_id, "https://example.com", "Example")
    bookmarks = db.list_bookmarks(coll_id)
    assert len(bookmarks) == 1
    assert bookmarks[0]["url"] == "https://example.com"
    assert bookmarks[0]["index_status"] == "pending"
    assert bookmarks[0]["id"] == bm_id


def test_update_bookmark_status(db: Database):
    coll_id = db.create_collection("Research", "")
    bm_id = db.add_bookmark(coll_id, "https://example.com", "Example")
    db.update_bookmark_status(bm_id, "done")
    bm = db.get_bookmark(bm_id)
    assert bm["index_status"] == "done"
    assert bm["indexed_at"] is not None


def test_add_chunks(db: Database):
    coll_id = db.create_collection("Research", "")
    bm_id = db.add_bookmark(coll_id, "https://example.com", "Example")
    db.add_chunks(bm_id, [("chunk text one", "chroma-1"), ("chunk text two", "chroma-2")])
    chunks = db.get_chunks_for_bookmark(bm_id)
    assert len(chunks) == 2
    assert chunks[0]["content"] == "chunk text one"


def test_delete_bookmark(db: Database):
    coll_id = db.create_collection("Research", "")
    bm_id = db.add_bookmark(coll_id, "https://example.com", "Example")
    db.delete_bookmark(bm_id)
    assert db.list_bookmarks(coll_id) == []


def test_duplicate_url_returns_existing(db: Database):
    coll_id = db.create_collection("Research", "")
    id1 = db.add_bookmark(coll_id, "https://example.com", "Example")
    id2 = db.add_bookmark(coll_id, "https://example.com", "Example Again")
    assert id1 == id2
