import { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";
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
import { Spinner } from "@/components/ui/spinner";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { api } from "../../api";
import { toast } from "@/lib/toast";
import type { Collection } from "../../types";

interface EditCollectionDialogProps {
  open: boolean;
  collection: Collection;
  onOpenChange: (open: boolean) => void;
  onEdited: (updated: Collection) => void;
  onDelete: () => void;
}

export default function EditCollectionDialog({
  open,
  collection,
  onOpenChange,
  onEdited,
  onDelete,
}: EditCollectionDialogProps) {
  const [name, setName] = useState(collection.name);
  const [desc, setDesc] = useState(collection.description);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(collection.name);
      setDesc(collection.description);
    }
  }, [open, collection]);

  async function handleUpdate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const updated = await api.updateCollection(collection.id, trimmed, desc.trim());
      onOpenChange(false);
      onEdited(updated);
    } catch (e) {
      toast.error(`Failed to update collection: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Edit collection</DialogTitle>
          <DialogDescription>
            Update the name and description for this collection.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="edit-collection-name">Name</FieldLabel>
            <Input
              id="edit-collection-name"
              placeholder="Collection name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleUpdate()}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-collection-desc">Description</FieldLabel>
            <Input
              id="edit-collection-desc"
              placeholder="Optional description"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </Field>
        </FieldGroup>
        <DialogFooter className="flex flex-row justify-between">
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              onOpenChange(false);
              onDelete();
            }}
          >
            <Trash2 />
            Delete
          </Button>
          <div className="flex space-x-2 ml-auto">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleUpdate} disabled={!name.trim() || saving}>
              {saving && <Spinner data-icon="inline-start" />}
              Update
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
