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
import type { ScanWarning } from "../../types";

interface ScanWarningDialogProps {
  open: boolean;
  warning: ScanWarning;
  onDiscard: () => void;
  onForce: () => void;
}

export default function ScanWarningDialog({ open, warning, onDiscard, onForce }: ScanWarningDialogProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onDiscard(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suspicious content detected</DialogTitle>
          <DialogDescription>
            Risk score {warning.risk_score.toFixed(2)} · signals: {warning.signals.join(", ")}
          </DialogDescription>
        </DialogHeader>
        {showDetails && (
          <div>
            <p className="text-sm font-medium">Flagged snippets</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {warning.matches.map((m, i) => (
                <li key={i} className="break-all">
                  <code className="text-destructive">{m}</code>
                </li>
              ))}
            </ul>
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDiscard}>
            Don&apos;t save
          </Button>
          <Button type="button" variant="ghost" onClick={() => setShowDetails(!showDetails)}>
            {showDetails ? "Hide" : "Show"} details
          </Button>
          <Button type="button" variant="destructive" onClick={onForce}>
            Save anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
