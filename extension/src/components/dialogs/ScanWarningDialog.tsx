import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TriangleAlertIcon } from "lucide-react";
import type { ScanWarning } from "../../types";

interface ScanWarningDialogProps {
  open: boolean;
  warning: ScanWarning;
  onDiscard: () => void;
  onForce: () => void;
}

export default function ScanWarningDialog({ open, warning, onDiscard, onForce }: ScanWarningDialogProps) {
  const [showDetails, setShowDetails] = useState(false);
  const unscannable = warning.signals.includes("content_unscannable");

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onDiscard(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {unscannable ? "Could not scan page" : "Suspicious content detected"}
          </DialogTitle>
          <DialogDescription>
            {unscannable
              ? "This page may be JavaScript-rendered. Saving without a scan could miss embedded instructions."
              : `Risk score ${warning.risk_score.toFixed(2)} · signals: ${warning.signals.join(", ")}`}
          </DialogDescription>
        </DialogHeader>
        {showDetails && (
          <Alert variant="destructive">
            <TriangleAlertIcon />
            <AlertTitle>Flagged snippets</AlertTitle>
            <AlertDescription>
              <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
                {warning.matches.map((m, i) => (
                  <li key={i} className="break-all">
                    <code>{m}</code>
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
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
