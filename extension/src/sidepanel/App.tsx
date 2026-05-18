import { useState, useEffect, useCallback } from "react";
import { api } from "../api";
import type { Collection, Bookmark, ScanWarning } from "../types";
import Header from "../components/Header";
import SearchBar from "../components/SearchBar";
import CollectionList from "../components/CollectionList";
import BookmarkList from "../components/BookmarkList";
import AddToCollection from "../components/AddToCollection";
import StatusBar from "../components/StatusBar";
import ThemeDemoView from "../components/ThemeDemoView";
import AppDialogs, { type RemoveBookmarksRequest } from "../components/dialogs/AppDialogs";
import SettingsDrawer from "../components/SettingsDrawer";
import { toast } from "@/lib/toast";
import { useActiveTab } from "@/lib/useActiveTab";

export default function App() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const currentTab = useActiveTab();
  const [daemonOnline, setDaemonOnline] = useState<boolean | null>(null);
  const [daemonVersion, setDaemonVersion] = useState("");
  const [newCollectionOpen, setNewCollectionOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [themeDemoOpen, setThemeDemoOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Collection | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Collection | null>(null);
  const [removeBookmarks, setRemoveBookmarks] = useState<RemoveBookmarksRequest | null>(null);
  const [clearBookmarkSelectionToken, setClearBookmarkSelectionToken] = useState(0);
  const [scanWarning, setScanWarning] = useState<ScanWarning | null>(null);
  const [pendingSave, setPendingSave] = useState<{
    collectionId: string;
    url: string;
    title: string;
    html: string | null;
    faviconUrl?: string;
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
    void chrome.storage.session.get("pendingScanWarning").then(({ pendingScanWarning }) => {
      if (!pendingScanWarning) return;
      void chrome.storage.session.remove("pendingScanWarning");
      const p = pendingScanWarning as {
        collectionId: string;
        url: string;
        title: string;
        html: string | null;
        faviconUrl?: string;
        warning: ScanWarning;
      };
      setScanWarning(p.warning);
      setPendingSave({
        collectionId: p.collectionId,
        url: p.url,
        title: p.title,
        html: p.html,
        faviconUrl: p.faviconUrl,
      });
    });
    const interval = setInterval(checkDaemon, 10_000);
    return () => clearInterval(interval);
  }, [checkDaemon, loadCollections]);

  useEffect(() => {
    if (!pendingSave || !currentTab?.url || pendingSave.url === currentTab.url) return;
    setScanWarning(null);
    setPendingSave(null);
  }, [currentTab?.url, pendingSave]);

  useEffect(() => {
    if (!selectedCollection) return;
    const load = () => api.listBookmarks(selectedCollection.id).then(setBookmarks).catch(() => {});
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [selectedCollection]);

  async function handleSelectCollection(coll: Collection) {
    setSearchOpen(false);
    setSearchQuery("");
    setSelectedCollection(coll);
    // useEffect on selectedCollection handles the initial fetch
  }

  function handleSearchToggle() {
    setSearchOpen((open) => {
      if (open) setSearchQuery("");
      return !open;
    });
  }

  async function handleAddBookmark(
    collectionId: string,
    html: string | null,
  ): Promise<"saved" | "scan_warning"> {
    if (!currentTab) return "scan_warning";
    const result = await api.addBookmark(
      collectionId,
      currentTab.url,
      currentTab.title,
      html,
      false,
      currentTab.faviconUrl,
    );
    if (result && "status" in result && result.status === "scan_warning") {
      setScanWarning(result as ScanWarning);
      setPendingSave({
        collectionId,
        url: currentTab.url,
        title: currentTab.title,
        html,
        faviconUrl: currentTab.faviconUrl,
      });
      return "scan_warning";
    }
    await loadCollections();
    return "saved";
  }

  async function handleForceSave() {
    if (!pendingSave) return;
    const { collectionId, url, title, html, faviconUrl } = pendingSave;
    try {
      await api.addBookmark(collectionId, url, title, html, true, faviconUrl);
      setPendingSave(null);
      setScanWarning(null);
      await loadCollections();
    } catch (e) {
      toast.error(`Failed to save: ${(e as Error).message}`);
    }
  }

  async function handleDeleteBookmarks(ids: string[]) {
    try {
      await Promise.all(ids.map((id) => api.deleteBookmark(id)));
    } catch (e) {
      toast.error(`Failed to remove bookmarks: ${(e as Error).message}`);
      throw e;
    }
    if (selectedCollection) {
      const bms = await api.listBookmarks(selectedCollection.id);
      setBookmarks(bms);
      await loadCollections();
    }
  }

  async function handleConfirmRemoveBookmarks() {
    if (!removeBookmarks) return;
    await handleDeleteBookmarks(removeBookmarks.bookmarkIds);
    setClearBookmarkSelectionToken((t) => t + 1);
  }

  async function handleReindexBookmarks(ids: string[]) {
    try {
      await Promise.all(ids.map((id) => api.reindexBookmark(id)));
    } catch (e) {
      toast.error(`Failed to re-index: ${(e as Error).message}`);
      throw e;
    }
    if (selectedCollection) {
      const bms = await api.listBookmarks(selectedCollection.id);
      setBookmarks(bms);
    }
  }

  async function handleCollectionCreated() {
    setNewCollectionOpen(false);
    await loadCollections();
  }

  async function handleCollectionEdited(updated: Collection) {
    setEditTarget(null);
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
    <div className="flex h-screen min-w-0 flex-col overflow-hidden testttt">
      <Header
        onNewCollection={() => setNewCollectionOpen(true)}
        onSettings={() => setSettingsOpen(true)}
        searchOpen={searchOpen}
        onSearchToggle={handleSearchToggle}
        showSearch={!selectedCollection}
      />
      {searchOpen && !selectedCollection && !themeDemoOpen && (
        <SearchBar value={searchQuery} onChange={setSearchQuery} autoFocus />
      )}

      {themeDemoOpen ? (
        <ThemeDemoView onBack={() => setThemeDemoOpen(false)} />
      ) : selectedCollection ? (
        <BookmarkList
          collection={selectedCollection}
          bookmarks={bookmarks}
          onBack={() => {
            setSelectedCollection(null);
            setBookmarks([]);
            setSearchOpen(false);
            setSearchQuery("");
          }}
          onEdit={() => setEditTarget(selectedCollection)}
          onRequestRemoveSelected={(ids) => {
            if (!selectedCollection) return;
            setRemoveBookmarks({
              collectionName: selectedCollection.name,
              bookmarkIds: ids,
            });
          }}
          onReindexBookmarks={handleReindexBookmarks}
          clearSelectionToken={clearBookmarkSelectionToken}
        />
      ) : (
        <CollectionList
          collections={collections}
          searchQuery={searchQuery}
          onSelect={handleSelectCollection}
          onEdit={setEditTarget}
        />
      )}

      {!themeDemoOpen && (
        <AddToCollection
          currentTab={currentTab}
          collections={collections}
          activeCollectionId={selectedCollection?.id ?? null}
          scanWarning={
            scanWarning && pendingSave?.url === currentTab?.url ? scanWarning : null
          }
          onAdd={handleAddBookmark}
        />
      )}
      <StatusBar
        online={daemonOnline}
        backend={daemonVersion}
        onOpenThemeDemo={() => setThemeDemoOpen(true)}
      />

      <AppDialogs
        newCollectionOpen={newCollectionOpen}
        onNewCollectionOpenChange={setNewCollectionOpen}
        onCollectionCreated={handleCollectionCreated}
        editTarget={editTarget}
        onEditOpenChange={(o) => { if (!o) setEditTarget(null); }}
        onCollectionEdited={handleCollectionEdited}
        onRequestDeleteCollection={(c) => {
          setDeleteTarget(c);
          setEditTarget(null);
        }}
        deleteTarget={deleteTarget}
        onDeleteOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        onCollectionDeleted={handleCollectionDeleted}
        removeBookmarks={removeBookmarks}
        onRemoveBookmarksOpenChange={(o) => { if (!o) setRemoveBookmarks(null); }}
        onConfirmRemoveBookmarks={handleConfirmRemoveBookmarks}
        scanWarning={scanWarning}
        scanWarningOpen={scanWarning !== null && pendingSave !== null}
        onScanWarningOpenChange={(o) => {
          if (!o) {
            setScanWarning(null);
            setPendingSave(null);
          }
        }}
        onScanWarningDiscard={() => {
          setScanWarning(null);
          setPendingSave(null);
        }}
        onScanWarningForce={handleForceSave}
      />
      <SettingsDrawer open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
