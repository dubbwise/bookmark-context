import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
      <DialogContent className="w-72">
        <DialogHeader>
          <DialogTitle>Rename Collection</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs">Collection name</Label>
            <Input
              placeholder="Collection name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 h-8 text-xs"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleUpdate()}
            />
          </div>
          <div>
            <Label className="text-xs">Description (optional)</Label>
            <Input
              placeholder="Description"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="mt-1 h-8 text-xs"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleUpdate} disabled={!name.trim() || saving}>Update</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
