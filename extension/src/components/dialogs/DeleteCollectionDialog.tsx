import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { api } from "../../api";
import { toast } from "@/lib/toast";
import type { Collection } from "../../types";

interface DeleteCollectionDialogProps {
  open: boolean;
  collection: Collection;
  onOpenChange: (open: boolean) => void;
  onDeleted: (id: string) => void;
}

export default function DeleteCollectionDialog({ open, collection, onOpenChange, onDeleted }: DeleteCollectionDialogProps) {
  const [confirmName, setConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);
  const nameMatches = confirmName === collection.name;

  useEffect(() => {
    if (open) setConfirmName("");
  }, [open, collection.id]);

  async function handleDelete() {
    if (!nameMatches) return;
    setDeleting(true);
    try {
      await api.deleteCollection(collection.id);
      onOpenChange(false);
      onDeleted(collection.id);
    } catch (e) {
      toast.error(`Failed to delete: ${(e as Error).message}`);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Delete {collection.name} collection</DialogTitle>
          <DialogDescription>
            This will permanently remove {collection.bookmark_count} saved page
            {collection.bookmark_count === 1 ? "" : "s"}. Type the collection name to confirm.
          </DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor="delete-collection-confirm">
            Collection name
          </FieldLabel>
          <Input
            id="delete-collection-confirm"
            placeholder={collection.name}
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            autoComplete="off"
            autoFocus
            className="ring-1 ring-destructive focus-visible:border-destructive focus-visible:ring-destructive/20"
          />
        </Field>
        <DialogFooter className="flex flex-row justify-between">
          <Button
            type="button"
            variant="destructive"
            disabled={deleting || !nameMatches}
            onClick={() => void handleDelete()}
            className="mr-auto"
          >
            {deleting && <Spinner data-icon="inline-start" />}
            Delete
          </Button>
          <Button type="button" variant="outline" disabled={deleting} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
