import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { Collection } from "../types";

interface CurrentPageProps {
  currentTab: { title: string; url: string } | null;
  collections: Collection[];
  onAdd: (collectionId: string, html: string | null) => Promise<void>;
}

async function captureHtml(): Promise<string | null> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return null;
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => document.documentElement.outerHTML,
    });
    return result?.result ?? null;
  } catch {
    return null;
  }
}

export default function CurrentPage({ currentTab, collections, onAdd }: CurrentPageProps) {
  const [selectedCollectionId, setSelectedCollectionId] = useState("");
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  async function handleAdd() {
    if (!selectedCollectionId || !currentTab) return;
    setAdding(true);
    try {
      const html = await captureHtml();
      await onAdd(selectedCollectionId, html);
      setAdded(true);
    } catch (e) {
      alert(`Failed to add bookmark: ${(e as Error).message}`);
    } finally {
      setAdding(false);
    }
  }

  useEffect(() => {
    if (!added) return;
    const timer = setTimeout(() => setAdded(false), 2000);
    return () => clearTimeout(timer);
  }, [added]);

  return (
    <>
      <Separator />
      <section className="px-3 py-2.5 flex-shrink-0 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Current page
        </p>
        <div className="bg-card rounded-md px-2.5 py-2 border border-border">
          <p className="text-sm font-medium truncate">{currentTab?.title || "—"}</p>
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
            {currentTab?.url || "—"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedCollectionId} onValueChange={setSelectedCollectionId}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select collection…" />
            </SelectTrigger>
            <SelectContent>
              {collections.map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-xs">
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            className="w-full h-8 text-xs"
            disabled={!selectedCollectionId || adding || added}
            onClick={handleAdd}
          >
            {added ? "✓ Added" : adding ? "Adding…" : "+ Add to collection"}
          </Button>
        </div>
      </section>
    </>
  );
}
