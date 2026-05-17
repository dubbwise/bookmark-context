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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { applyTheme, type Theme } from "@/lib/theme";

interface SettingsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const THEME_OPTIONS: { value: Theme; label: string; id: string }[] = [
  { value: "light", label: "Light", id: "theme-light" },
  { value: "dark", label: "Dark", id: "theme-dark" },
  { value: "system", label: "System", id: "theme-system" },
];

export default function SettingsDrawer({ open, onOpenChange }: SettingsDrawerProps) {
  const [port, setPort] = useState(7331);
  const [theme, setTheme] = useState<Theme>("dark");
  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) {
      setSaved(false);
      return;
    }
    chrome.storage.sync.get({ daemonPort: 7331, theme: "dark" }).then(({ daemonPort, theme: stored }) => {
      setPort(daemonPort ?? 7331);
      if (stored === "light" || stored === "dark" || stored === "system") {
        setTheme(stored);
      } else {
        setTheme("dark");
      }
    });
  }, [open]);

  useEffect(() => () => {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
  }, []);

  async function handleSave() {
    if (!Number.isInteger(port) || port < 1 || port > 65535) return;
    await chrome.storage.sync.set({ daemonPort: port, theme });
    applyTheme(theme);
    setSaved(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
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
          <div className="space-y-2">
            <Label>Theme</Label>
            <RadioGroup value={theme} onValueChange={(v) => setTheme(v as Theme)} className="space-y-2">
              {THEME_OPTIONS.map(({ value, label, id }) => (
                <div key={value} className="flex items-center gap-2">
                  <RadioGroupItem value={value} id={id} />
                  <Label htmlFor={id} className="font-normal cursor-pointer">
                    {label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
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
