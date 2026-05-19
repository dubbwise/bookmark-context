import time
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


def test_list_collections_favicon_previews_deduped_and_ordered(db):
    coll_id = db.create_collection("Research", "")
    db.add_bookmark(coll_id, "https://a.com/1", "A1", "https://a.com/favicon.ico")
    db.add_bookmark(coll_id, "https://a.com/2", "A2", "https://a.com/favicon.ico")
    db.add_bookmark(coll_id, "https://b.com/1", "B1", "https://b.com/favicon.ico")
    db.add_bookmark(coll_id, "https://b.com/2", "B2", "https://b.com/favicon.ico")
    db.add_bookmark(coll_id, "https://b.com/3", "B3", "https://b.com/favicon.ico")
    db.add_bookmark(coll_id, "https://c.com/", "C", "")

    colls = db.list_collections()
    assert len(colls) == 1
    previews = colls[0]["favicon_previews"]
    assert [p["favicon_url"] for p in previews[:2]] == [
        "https://b.com/favicon.ico",
        "https://a.com/favicon.ico",
    ]
    assert previews[2]["url"] == "https://c.com/"
    assert previews[2]["favicon_url"] == ""


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


def test_add_bookmark_stores_favicon_url(db: Database):
    coll_id = db.create_collection("Research", "")
    bm_id = db.add_bookmark(
        coll_id, "https://example.com", "Example", favicon_url="https://example.com/icon.png"
    )
    bm = db.get_bookmark(bm_id)
    assert bm["favicon_url"] == "https://example.com/icon.png"


def test_update_bookmark_status_done_stores_favicon(db: Database):
    coll_id = db.create_collection("Research", "")
    bm_id = db.add_bookmark(coll_id, "https://example.com", "Example")
    db.update_bookmark_status(bm_id, "done", favicon_url="https://example.com/favicon.ico")
    bm = db.get_bookmark(bm_id)
    assert bm["favicon_url"] == "https://example.com/favicon.ico"


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


def test_update_collection_changes_name_and_description(db: Database):
    coll_id = db.create_collection("Old Name", "old desc")
    db.update_collection(coll_id, "New Name", "new desc")
    coll = db.get_collection(coll_id)
    assert coll["name"] == "New Name"
    assert coll["description"] == "new desc"


def test_update_collection_changes_updated_at(db: Database):
    coll_id = db.create_collection("Name", "")
    before = db.get_collection(coll_id)["updated_at"]
    time.sleep(0.02)
    db.update_collection(coll_id, "Name", "")
    after = db.get_collection(coll_id)["updated_at"]
    assert after > before
