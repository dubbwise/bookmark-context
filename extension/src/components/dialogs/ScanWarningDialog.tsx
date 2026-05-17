import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
      <DialogContent className="w-72">
        <DialogHeader>
          <DialogTitle>⚠ Suspicious content detected</DialogTitle>
        </DialogHeader>
        <div className="py-1 space-y-3">
          <p className="text-xs text-muted-foreground">
            Risk score {warning.risk_score.toFixed(2)} · signals: {warning.signals.join(", ")}
          </p>
          {showDetails && (
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                Flagged snippets
              </p>
              <ul className="list-disc pl-3.5 space-y-1">
                {warning.matches.map((m, i) => (
                  <li key={i} className="text-[11px] text-red-400 break-all">
                    <code>{m}</code>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <DialogFooter className="flex gap-1.5">
          <Button variant="outline" size="sm" onClick={onDiscard}>Don't save</Button>
          <Button variant="ghost" size="sm" onClick={() => setShowDetails(!showDetails)}>
            {showDetails ? "Hide" : "Show"} details
          </Button>
          <Button
            size="sm"
            className="bg-red-900 text-red-300 hover:bg-red-800"
            onClick={onForce}
          >
            Save anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
