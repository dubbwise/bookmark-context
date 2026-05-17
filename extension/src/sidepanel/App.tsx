import { useState, useEffect, useCallback } from "react";
import { api } from "../api";
import type { Collection, Bookmark, ScanWarning } from "../types";
import Header from "../components/Header";
import SearchBar from "../components/SearchBar";
import CollectionList from "../components/CollectionList";
import BookmarkList from "../components/BookmarkList";
import CurrentPage from "../components/CurrentPage";
import StatusBar from "../components/StatusBar";
import NewCollectionDialog from "../components/dialogs/NewCollectionDialog";
import RenameCollectionDialog from "../components/dialogs/RenameCollectionDialog";
import DeleteCollectionDialog from "../components/dialogs/DeleteCollectionDialog";
import ScanWarningDialog from "../components/dialogs/ScanWarningDialog";

export default function App() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentTab, setCurrentTab] = useState<{ title: string; url: string } | null>(null);
  const [daemonOnline, setDaemonOnline] = useState<boolean | null>(null);
  const [daemonVersion, setDaemonVersion] = useState("");
  const [newCollectionOpen, setNewCollectionOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Collection | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Collection | null>(null);
  const [scanWarning, setScanWarning] = useState<ScanWarning | null>(null);
  const [pendingSave, setPendingSave] = useState<{
    collectionId: string; url: string; title: string; html: string | null;
  } | null>(null);

  const loadCollections = useCallback(async () => {
    try {
      const cols = await api.listCollections();
      setCollections(cols);
    } catch {
      // daemon offline
    }
  }, []);

  const checkDaemon = useCallback(async () => {
    try {
      const s = await api.status();
      setDaemonOnline(true);
      setDaemonVersion(s.version);
    } catch {
      setDaemonOnline(false);
      setDaemonVersion("");
    }
  }, []);

  useEffect(() => {
    checkDaemon();
    loadCollections();
    chrome.tabs
      .query({ active: true, currentWindow: true })
      .then(([tab]) => {
        if (tab) setCurrentTab({ title: tab.title || tab.url || "", url: tab.url || "" });
      });
    const interval = setInterval(checkDaemon, 10_000);
    return () => clearInterval(interval);
  }, [checkDaemon, loadCollections]);

  useEffect(() => {
    if (!selectedCollection) return;
    const load = () => api.listBookmarks(selectedCollection.id).then(setBookmarks).catch(() => {});
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [selectedCollection]);

  async function handleSelectCollection(coll: Collection) {
    setSelectedCollection(coll);
    const bms = await api.listBookmarks(coll.id);
    setBookmarks(bms);
  }

  async function handleAddBookmark(collectionId: string, html: string | null) {
    if (!currentTab) return;
    const result = await api.addBookmark(collectionId, currentTab.url, currentTab.title, html);
    if (result && "status" in result && result.status === "scan_warning") {
      setScanWarning(result as ScanWarning);
      setPendingSave({ collectionId, url: currentTab.url, title: currentTab.title, html });
      return;
    }
    await loadCollections();
  }

  async function handleForceSave() {
    if (!pendingSave) return;
    const { collectionId, url, title, html } = pendingSave;
    setPendingSave(null);
    setScanWarning(null);
    await api.addBookmark(collectionId, url, title, html, true);
    await loadCollections();
  }

  async function handleDeleteBookmark(id: string) {
    await api.deleteBookmark(id);
    if (selectedCollection) {
      const bms = await api.listBookmarks(selectedCollection.id);
      setBookmarks(bms);
      await loadCollections();
    }
  }

  async function handleReindexBookmark(id: string) {
    await api.reindexBookmark(id);
    if (selectedCollection) {
      const bms = await api.listBookmarks(selectedCollection.id);
      setBookmarks(bms);
    }
  }

  async function handleCollectionCreated() {
    setNewCollectionOpen(false);
    await loadCollections();
  }

  async function handleCollectionRenamed(updated: Collection) {
    setRenameTarget(null);
    await loadCollections();
    if (selectedCollection?.id === updated.id) setSelectedCollection(updated);
  }

  async function handleCollectionDeleted(id: string) {
    setDeleteTarget(null);
    if (selectedCollection?.id === id) {
      setSelectedCollection(null);
      setBookmarks([]);
    }
    await loadCollections();
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header onNewCollection={() => setNewCollectionOpen(true)} />
      <SearchBar value={searchQuery} onChange={setSearchQuery} />

      {selectedCollection ? (
        <BookmarkList
          collection={selectedCollection}
          bookmarks={bookmarks}
          onBack={() => { setSelectedCollection(null); setBookmarks([]); }}
          onRename={() => setRenameTarget(selectedCollection)}
          onDelete={() => setDeleteTarget(selectedCollection)}
          onDeleteBookmark={handleDeleteBookmark}
          onReindex={handleReindexBookmark}
        />
      ) : (
        <CollectionList
          collections={collections}
          searchQuery={searchQuery}
          onSelect={handleSelectCollection}
          onRename={setRenameTarget}
          onDelete={setDeleteTarget}
        />
      )}

      <CurrentPage currentTab={currentTab} collections={collections} onAdd={handleAddBookmark} />
      <StatusBar online={daemonOnline} backend={daemonVersion} />

      <NewCollectionDialog
        open={newCollectionOpen}
        onOpenChange={setNewCollectionOpen}
        onCreated={handleCollectionCreated}
      />
      {renameTarget && (
        <RenameCollectionDialog
          collection={renameTarget}
          open={true}
          onOpenChange={(o) => { if (!o) setRenameTarget(null); }}
          onRenamed={handleCollectionRenamed}
        />
      )}
      {deleteTarget && (
        <DeleteCollectionDialog
          collection={deleteTarget}
          open={true}
          onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
          onDeleted={handleCollectionDeleted}
        />
      )}
      {scanWarning && pendingSave && (
        <ScanWarningDialog
          warning={scanWarning}
          open={true}
          onDiscard={() => { setScanWarning(null); setPendingSave(null); }}
          onForce={handleForceSave}
        />
      )}
    </div>
  );
}
