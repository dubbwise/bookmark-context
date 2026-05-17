import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Collection</DialogTitle>
          <DialogDescription>
            Delete <span className="font-medium text-foreground">{collection.name}</span>? This will
            permanently remove {collection.bookmark_count} saved page
            {collection.bookmark_count === 1 ? "" : "s"}.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
