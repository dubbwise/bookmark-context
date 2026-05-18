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
import { Spinner } from "@/components/ui/spinner";
import { destructiveDialogFooterClass } from "./dialog-layout";

interface RemoveBookmarksDialogProps {
  open: boolean;
  collectionName: string;
  count: number;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
}

export default function RemoveBookmarksDialog({
  open,
  collectionName,
  count,
  onOpenChange,
  onConfirm,
}: RemoveBookmarksDialogProps) {
  const [removing, setRemoving] = useState(false);

  async function handleConfirm() {
    setRemoving(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      /* parent toasts on failure */
    } finally {
      setRemoving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Remove selected pages?</DialogTitle>
          <DialogDescription>
            Permanently remove {count} saved page{count === 1 ? "" : "s"} from{" "}
            <span className="font-medium text-foreground">{collectionName}</span>. This cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className={destructiveDialogFooterClass}>
          <Button
            type="button"
            variant="destructive"
            disabled={removing}
            onClick={() => void handleConfirm()}
          >
            {removing && <Spinner data-icon="inline-start" />}
            Remove
          </Button>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={removing}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
