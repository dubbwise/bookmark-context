import { useEffect, useRef, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SettingsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SettingsDrawer({ open, onOpenChange }: SettingsDrawerProps) {
  const [port, setPort] = useState(7331);
  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    chrome.storage.sync.get("daemonPort").then(({ daemonPort = 7331 }) => {
      setPort(daemonPort);
    });
  }, [open]);

  useEffect(() => () => {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
  }, []);

  async function handleSave() {
    if (!Number.isInteger(port) || port < 1 || port > 65535) return;
    await chrome.storage.sync.set({ daemonPort: port });
    setSaved(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent aria-describedby={undefined}>
        <DrawerHeader>
          <DrawerTitle>Settings</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 space-y-4 pb-2">
          <div className="space-y-1.5">
            <Label htmlFor="settings-daemon-port">Daemon port</Label>
            <Input
              id="settings-daemon-port"
              type="number"
              min={1}
              max={65535}
              value={port}
              onChange={(e) => setPort(Number(e.target.value))}
            />
          </div>
        </div>
        <DrawerFooter>
          <Button onClick={handleSave} disabled={saved}>
            {saved ? "Saved ✓" : "Save"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
