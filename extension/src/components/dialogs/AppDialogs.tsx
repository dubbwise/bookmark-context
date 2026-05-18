import NewCollectionDialog from "./NewCollectionDialog";
import EditCollectionDialog from "./EditCollectionDialog";
import DeleteCollectionDialog from "./DeleteCollectionDialog";
import RemoveBookmarksDialog from "./RemoveBookmarksDialog";
import ScanWarningDialog from "./ScanWarningDialog";
import type { Collection, ScanWarning } from "../../types";

export interface RemoveBookmarksRequest {
  collectionName: string;
  bookmarkIds: string[];
}

interface AppDialogsProps {
  newCollectionOpen: boolean;
  onNewCollectionOpenChange: (open: boolean) => void;
  onCollectionCreated: () => void;

  editTarget: Collection | null;
  onEditOpenChange: (open: boolean) => void;
  onCollectionEdited: (updated: Collection) => void;
  onRequestDeleteCollection: (collection: Collection) => void;

  deleteTarget: Collection | null;
  onDeleteOpenChange: (open: boolean) => void;
  onCollectionDeleted: (id: string) => void;

  removeBookmarks: RemoveBookmarksRequest | null;
  onRemoveBookmarksOpenChange: (open: boolean) => void;
  onConfirmRemoveBookmarks: () => void | Promise<void>;

  scanWarning: ScanWarning | null;
  scanWarningOpen: boolean;
  onScanWarningOpenChange: (open: boolean) => void;
  onScanWarningDiscard: () => void;
  onScanWarningForce: () => void;
}

export default function AppDialogs({
  newCollectionOpen,
  onNewCollectionOpenChange,
  onCollectionCreated,
  editTarget,
  onEditOpenChange,
  onCollectionEdited,
  onRequestDeleteCollection,
  deleteTarget,
  onDeleteOpenChange,
  onCollectionDeleted,
  removeBookmarks,
  onRemoveBookmarksOpenChange,
  onConfirmRemoveBookmarks,
  scanWarning,
  scanWarningOpen,
  onScanWarningOpenChange,
  onScanWarningDiscard,
  onScanWarningForce,
}: AppDialogsProps) {
  return (
    <>
      <NewCollectionDialog
        open={newCollectionOpen}
        onOpenChange={onNewCollectionOpenChange}
        onCreated={onCollectionCreated}
      />
      <EditCollectionDialog
        open={editTarget !== null}
        collection={editTarget}
        onOpenChange={onEditOpenChange}
        onEdited={onCollectionEdited}
        onDelete={() => {
          if (!editTarget) return;
          onEditOpenChange(false);
          onRequestDeleteCollection(editTarget);
        }}
      />
      <DeleteCollectionDialog
        open={deleteTarget !== null}
        collection={deleteTarget}
        onOpenChange={onDeleteOpenChange}
        onDeleted={onCollectionDeleted}
      />
      <RemoveBookmarksDialog
        open={removeBookmarks !== null}
        collectionName={removeBookmarks?.collectionName ?? ""}
        count={removeBookmarks?.bookmarkIds.length ?? 0}
        onOpenChange={onRemoveBookmarksOpenChange}
        onConfirm={onConfirmRemoveBookmarks}
      />
      {scanWarning ? (
        <ScanWarningDialog
          open={scanWarningOpen}
          warning={scanWarning}
          onOpenChange={onScanWarningOpenChange}
          onDiscard={onScanWarningDiscard}
          onForce={onScanWarningForce}
        />
      ) : null}
    </>
  );
}
