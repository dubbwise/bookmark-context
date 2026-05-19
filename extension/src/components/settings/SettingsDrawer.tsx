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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Field, FieldGroup, FieldLabel, FieldTitle } from "@/components/ui/field";
import { applyTheme, setStoredTheme, type Theme } from "@/lib/theme";

interface SettingsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
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

  function handleThemeChange(next: Theme) {
    setTheme(next);
    applyTheme(next);
    void setStoredTheme(next);
  }

  async function handleSave() {
    if (!Number.isInteger(port) || port < 1 || port > 65535) return;
    await chrome.storage.sync.set({ daemonPort: port, theme });
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
        <div className="flex flex-col gap-4 px-4 pb-2">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="settings-daemon-port">Daemon port</FieldLabel>
              <Input
                id="settings-daemon-port"
                type="number"
                min={1}
                max={65535}
                value={port}
                onChange={(e) => setPort(Number(e.target.value))}
              />
            </Field>
            <Field orientation="horizontal">
              <FieldTitle id="settings-theme-label">Theme</FieldTitle>
              <ToggleGroup
                type="single"
                value={theme}
                onValueChange={(v) => v && handleThemeChange(v as Theme)}
                variant="outline"
                size="sm"
                spacing={2}
                aria-labelledby="settings-theme-label"
              >
                {THEME_OPTIONS.map(({ value, label }) => (
                  <ToggleGroupItem key={value} value={value} aria-label={label}>
                    {label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </Field>
          </FieldGroup>
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
