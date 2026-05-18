import { useState } from "react";
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

interface NewCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export default function NewCollectionDialog({ open, onOpenChange, onCreated }: NewCollectionDialogProps) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await api.createCollection(trimmed, desc.trim());
      setName("");
      setDesc("");
      onOpenChange(false);
      onCreated();
    } catch (e) {
      toast.error(`Failed to create collection: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>New collection</DialogTitle>
          <DialogDescription>
            Create a collection to organize saved pages.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="new-collection-name">Name</FieldLabel>
            <Input
              id="new-collection-name"
              placeholder="Collection name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="new-collection-desc">Description</FieldLabel>
            <Input
              id="new-collection-desc"
              placeholder="Optional description"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </Field>
        </FieldGroup>
        <DialogFooter className="flex-row">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleCreate} disabled={!name.trim() || saving}>
            {saving && <Spinner data-icon="inline-start" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
