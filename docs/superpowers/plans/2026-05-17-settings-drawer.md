# Settings Drawer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken "open options page" gear button with a bottom-sheet drawer that opens inside the sidebar and lets the user configure the daemon port.

**Architecture:** Add the shadcn/ui Drawer component (backed by vaul), create a self-contained `SettingsDrawer` component that reads/writes `chrome.storage.sync`, wire it into `App.tsx` via an `onSettings` prop on `Header` — same pattern as `onNewCollection`.

**Tech Stack:** React, TypeScript, shadcn/ui, vaul, Vite, Vitest + Testing Library, Chrome Extension MV3

---

## File Map

| Action | File |
|--------|------|
| Create (auto) | `extension/src/components/ui/drawer.tsx` |
| Create | `extension/src/components/SettingsDrawer.tsx` |
| Create | `extension/src/components/SettingsDrawer.test.tsx` |
| Modify | `extension/src/components/Header.tsx` |
| Modify | `extension/src/components/Header.test.tsx` |
| Modify | `extension/src/sidepanel/App.tsx` |

---

## Task 1: Install the shadcn Drawer component

**Files:**
- Create (auto-generated): `extension/src/components/ui/drawer.tsx`

- [ ] **Step 1: Run the shadcn add command**

```bash
cd /Users/bb/Sandbox/bookmark-context/extension
npx shadcn@latest add drawer
```

Accept all prompts. This installs `vaul` and generates `src/components/ui/drawer.tsx`.

- [ ] **Step 2: Verify the file was created**

```bash
cat extension/src/components/ui/drawer.tsx | head -5
```

Expected: file starts with `"use client"` or imports from `vaul`.

- [ ] **Step 3: Commit**

```bash
git add extension/src/components/ui/drawer.tsx extension/package.json extension/package-lock.json
git commit -m "feat(extension): add shadcn drawer component"
```

---

## Task 2: Update Header to accept onSettings prop

**Files:**
- Modify: `extension/src/components/Header.tsx`
- Modify: `extension/src/components/Header.test.tsx`

- [ ] **Step 1: Write the failing test**

Add to `extension/src/components/Header.test.tsx` (replace entire file):

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Header from "./Header";

describe("Header", () => {
  it("renders logo text", () => {
    render(<Header onNewCollection={vi.fn()} onSettings={vi.fn()} />);
    expect(screen.getByText(/Bookmark Context/i)).toBeInTheDocument();
  });

  it("renders settings button", () => {
    render(<Header onNewCollection={vi.fn()} onSettings={vi.fn()} />);
    expect(screen.getByTitle(/settings/i)).toBeInTheDocument();
  });

  it("calls onNewCollection when + New button is clicked", () => {
    const onNewCollection = vi.fn();
    render(<Header onNewCollection={onNewCollection} onSettings={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /new/i }));
    expect(onNewCollection).toHaveBeenCalledOnce();
  });

  it("calls onSettings when settings button is clicked", () => {
    const onSettings = vi.fn();
    render(<Header onNewCollection={vi.fn()} onSettings={onSettings} />);
    fireEvent.click(screen.getByTitle(/settings/i));
    expect(onSettings).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run tests to confirm the new test fails**

```bash
cd extension && npm test -- --reporter=verbose Header.test
```

Expected: `calls onSettings when settings button is clicked` → FAIL (Header doesn't accept `onSettings` yet, TypeScript will error).

- [ ] **Step 3: Update Header.tsx**

Replace `extension/src/components/Header.tsx` with:

```tsx
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface HeaderProps {
  onNewCollection: () => void;
  onSettings: () => void;
}

export default function Header({ onNewCollection, onSettings }: HeaderProps) {
  return (
    <>
      <header className="flex items-center justify-between px-3 py-2.5 bg-primary/10 flex-shrink-0">
        <span className="font-semibold text-sm">📚 Bookmark Context</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs px-2"
            onClick={onNewCollection}
          >
            + New
          </Button>
          <button
            onClick={onSettings}
            title="Settings"
            className="text-muted-foreground hover:text-foreground text-base leading-none px-1 cursor-pointer bg-transparent border-0"
          >
            ⚙
          </button>
        </div>
      </header>
      <Separator />
    </>
  );
}
```

- [ ] **Step 4: Run tests to confirm all pass**

```bash
cd extension && npm test -- --reporter=verbose Header.test
```

Expected: all 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add extension/src/components/Header.tsx extension/src/components/Header.test.tsx
git commit -m "feat(extension): add onSettings prop to Header"
```

---

## Task 3: Create SettingsDrawer component

**Files:**
- Create: `extension/src/components/SettingsDrawer.tsx`
- Create: `extension/src/components/SettingsDrawer.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `extension/src/components/SettingsDrawer.test.tsx`:

```tsx
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SettingsDrawer from "./SettingsDrawer";

const mockGet = vi.fn();
const mockSet = vi.fn();

vi.stubGlobal("chrome", {
  storage: { sync: { get: mockGet, set: mockSet } },
});

describe("SettingsDrawer", () => {
  beforeEach(() => {
    mockGet.mockResolvedValue({ daemonPort: 7331 });
    mockSet.mockResolvedValue(undefined);
  });

  it("reads daemonPort from storage when opened", async () => {
    render(<SettingsDrawer open={true} onOpenChange={vi.fn()} />);
    await act(async () => {});
    expect(mockGet).toHaveBeenCalledWith("daemonPort");
  });

  it("displays the port value from storage", async () => {
    mockGet.mockResolvedValue({ daemonPort: 8080 });
    render(<SettingsDrawer open={true} onOpenChange={vi.fn()} />);
    await act(async () => {});
    expect(screen.getByLabelText(/daemon port/i)).toHaveValue(8080);
  });

  it("defaults to 7331 when storage has no value", async () => {
    mockGet.mockResolvedValue({});
    render(<SettingsDrawer open={true} onOpenChange={vi.fn()} />);
    await act(async () => {});
    expect(screen.getByLabelText(/daemon port/i)).toHaveValue(7331);
  });

  it("saves port to storage when Save is clicked", async () => {
    mockGet.mockResolvedValue({ daemonPort: 7331 });
    render(<SettingsDrawer open={true} onOpenChange={vi.fn()} />);
    await act(async () => {});
    const input = screen.getByLabelText(/daemon port/i);
    await userEvent.clear(input);
    await userEvent.type(input, "9000");
    await act(async () => {
      await userEvent.click(screen.getByRole("button", { name: /save/i }));
    });
    expect(mockSet).toHaveBeenCalledWith({ daemonPort: 9000 });
  });

  it("shows Saved ✓ after saving", async () => {
    render(<SettingsDrawer open={true} onOpenChange={vi.fn()} />);
    await act(async () => {});
    await act(async () => {
      await userEvent.click(screen.getByRole("button", { name: /save/i }));
    });
    expect(screen.getByRole("button", { name: /saved/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd extension && npm test -- --reporter=verbose SettingsDrawer.test
```

Expected: all 5 tests FAIL (module not found).

- [ ] **Step 3: Create SettingsDrawer.tsx**

Create `extension/src/components/SettingsDrawer.tsx`:

```tsx
import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (!open) return;
    chrome.storage.sync.get("daemonPort").then(({ daemonPort = 7331 }) => {
      setPort(daemonPort);
    });
  }, [open]);

  async function handleSave() {
    await chrome.storage.sync.set({ daemonPort: port });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
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
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd extension && npm test -- --reporter=verbose SettingsDrawer.test
```

Expected: all 5 tests PASS.

If vaul throws errors in jsdom (e.g. pointer-events related), add to `extension/src/test-setup.ts`:

```ts
// vaul uses PointerEvent; jsdom stubs it
if (!global.PointerEvent) {
  class PointerEvent extends MouseEvent {
    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
    }
  }
  global.PointerEvent = PointerEvent as typeof PointerEvent;
}
```

- [ ] **Step 5: Commit**

```bash
git add extension/src/components/SettingsDrawer.tsx extension/src/components/SettingsDrawer.test.tsx extension/src/test-setup.ts
git commit -m "feat(extension): add SettingsDrawer bottom-sheet component"
```

---

## Task 4: Wire SettingsDrawer into App

**Files:**
- Modify: `extension/src/sidepanel/App.tsx`

- [ ] **Step 1: Update App.tsx**

In `extension/src/sidepanel/App.tsx`, make these three changes:

**Add import** (after existing dialog imports):
```tsx
import SettingsDrawer from "../components/SettingsDrawer";
```

**Add state** (alongside `newCollectionOpen` state):
```tsx
const [settingsOpen, setSettingsOpen] = useState(false);
```

**Update Header** (pass new prop):
```tsx
<Header onNewCollection={() => setNewCollectionOpen(true)} onSettings={() => setSettingsOpen(true)} />
```

**Add drawer** (after the closing `}` of the last `scanWarning && pendingSave` block, before `</div>`):
```tsx
<SettingsDrawer open={settingsOpen} onOpenChange={setSettingsOpen} />
```

The final JSX return should end like:

```tsx
      {scanWarning && pendingSave && (
        <ScanWarningDialog
          warning={scanWarning}
          open={true}
          onDiscard={() => { setScanWarning(null); setPendingSave(null); }}
          onForce={handleForceSave}
        />
      )}
      <SettingsDrawer open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
```

- [ ] **Step 2: Run the full test suite**

```bash
cd extension && npm test
```

Expected: all tests PASS (no regressions).

- [ ] **Step 3: Build to check for TypeScript errors**

```bash
cd extension && npm run build
```

Expected: build completes with no errors.

- [ ] **Step 4: Commit**

```bash
git add extension/src/sidepanel/App.tsx
git commit -m "feat(extension): wire SettingsDrawer into App via onSettings prop"
```
