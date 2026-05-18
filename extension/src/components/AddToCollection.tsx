import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Favicon } from "@/components/Favicon";
import { toast } from "@/lib/toast";
import { capturePageHtml } from "@/lib/capturePage";
import { TriangleAlertIcon } from "lucide-react";
import type { Collection, CurrentTab, ScanWarning } from "../types";

export type { CurrentTab };

export type AddBookmarkResult = "saved" | "scan_warning";

interface AddToCollectionProps {
  currentTab: CurrentTab | null;
  collections: Collection[];
  /** When viewing a collection, preselect it in the dropdown. */
  activeCollectionId?: string | null;
  scanWarning?: ScanWarning | null;
  onAdd: (collectionId: string, html: string | null) => Promise<AddBookmarkResult>;
}

function scanWarningMessage(warning: ScanWarning): string {
  if (warning.signals.includes("content_unscannable")) {
    return "Could not scan this page (likely JavaScript-rendered). Not saved — review the warning to save or discard.";
  }
  return `Suspicious content detected (risk ${warning.risk_score.toFixed(2)}). Not saved — review the warning to save or discard.`;
}

export default function AddToCollection({
  currentTab,
  collections,
  activeCollectionId = null,
  scanWarning = null,
  onAdd,
}: AddToCollectionProps) {
  const [selectedCollectionId, setSelectedCollectionId] = useState("");
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  async function handleAdd() {
    if (!selectedCollectionId || !currentTab) return;
    setAdding(true);
    try {
      const html = await capturePageHtml();
      const result = await onAdd(selectedCollectionId, html);
      if (result === "saved") setAdded(true);
    } catch (e) {
      toast.error(`Failed to add bookmark: ${(e as Error).message}`);
    } finally {
      setAdding(false);
    }
  }

  useEffect(() => {
    if (!added) return;
    const timer = setTimeout(() => setAdded(false), 2000);
    return () => clearTimeout(timer);
  }, [added]);

  useEffect(() => {
    setAdded(false);
  }, [currentTab?.url]);

  useEffect(() => {
    if (activeCollectionId && collections.some((c) => c.id === activeCollectionId)) {
      setSelectedCollectionId(activeCollectionId);
    } else if (!activeCollectionId) {
      setSelectedCollectionId("");
    }
  }, [activeCollectionId, collections]);

  return (
    <>
      <Separator />
      <section className="flex min-w-0 shrink-0 flex-col gap-2 px-3 py-2.5">
        <p className="text-xs font-medium text-muted-foreground">
          Add to collection
        </p>
        <Item key={currentTab?.url ?? "no-tab"} size="xs" variant="default" className="min-w-0 grid grid-cols-[auto_1fr]">
          <ItemMedia variant="image">
            {currentTab?.url ? (
              <Favicon
                key={currentTab.url}
                url={currentTab.url}
                faviconUrl={currentTab.faviconUrl}
                className="size-full rounded-sm"
              />
            ) : (
              <div className="size-full rounded-sm bg-muted" aria-hidden />
            )}
          </ItemMedia>
          <ItemContent>
            <ItemTitle>{currentTab?.title || "—"}</ItemTitle>
            <ItemDescription className="truncate">{currentTab?.url || "—"}</ItemDescription>
            {scanWarning ? (
              <Alert variant="destructive" className="mt-1.5 py-1.5">
                <TriangleAlertIcon />
                <AlertDescription className="text-xs">
                  {scanWarningMessage(scanWarning)}
                </AlertDescription>
              </Alert>
            ) : null}
          </ItemContent>
        </Item>
        <div className="flex min-w-0 gap-2">
          <Select value={selectedCollectionId} onValueChange={setSelectedCollectionId}>
            <SelectTrigger className="w-full min-w-0 text-sm">
              <SelectValue placeholder="Select collection…" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {collections.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-sm">
                    {c.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button
            className="text-sm"
            disabled={!selectedCollectionId || adding || added}
            onClick={handleAdd}
          >
            {adding && <Spinner data-icon="inline-start" />}
            {added ? "✓ Added" : adding ? "Adding…" : "Add to collection"}
          </Button>
        </div>
      </section>
    </>
  );
}
