import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { api } from "../../api";
import type { Collection } from "../../types";

interface DeleteCollectionDialogProps {
  open: boolean;
  collection: Collection;
  onOpenChange: (open: boolean) => void;
  onDeleted: (id: string) => void;
}

export default function DeleteCollectionDialog({ open, collection, onOpenChange, onDeleted }: DeleteCollectionDialogProps) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.deleteCollection(collection.id);
      onOpenChange(false);
      onDeleted(collection.id);
    } catch (e) {
      alert(`Failed to delete: ${(e as Error).message}`);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-72">
        <DialogHeader>
          <DialogTitle>Delete Collection</DialogTitle>
        </DialogHeader>
        <div className="py-2 text-sm text-muted-foreground">
          <p>Delete <strong className="text-foreground">{collection.name}</strong>?</p>
          <p className="mt-1 text-destructive text-xs">
            This will permanently remove {collection.bookmark_count} saved page(s).
          </p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
