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
import { Label } from "@/components/ui/label";
import { api } from "../../api";
import type { Collection } from "../../types";

interface RenameCollectionDialogProps {
  open: boolean;
  collection: Collection;
  onOpenChange: (open: boolean) => void;
  onRenamed: (updated: Collection) => void;
}

export default function RenameCollectionDialog({ open, collection, onOpenChange, onRenamed }: RenameCollectionDialogProps) {
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
      onRenamed(updated);
    } catch (e) {
      alert(`Failed to rename: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename Collection</DialogTitle>
          <DialogDescription>
            Update the name and description for this collection.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="rename-collection-name">Name</Label>
            <Input
              id="rename-collection-name"
              placeholder="Collection name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleUpdate()}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="rename-collection-desc">Description</Label>
            <Input
              id="rename-collection-desc"
              placeholder="Optional description"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleUpdate} disabled={!name.trim() || saving}>
            Update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
