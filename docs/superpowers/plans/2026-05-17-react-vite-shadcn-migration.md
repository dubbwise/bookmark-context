# React + Vite + shadcn/ui Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the Chrome MV3 extension side panel from vanilla JS/CSS to React 18 + Vite 5 + shadcn/ui, introducing a build step while keeping `shared/api.js`, `background/service_worker.js`, `content/content_script.js`, and `options/` completely unchanged.

**Architecture:** Vite project rooted at `extension/`, using `vite-plugin-web-extension` to process `manifest.json` as the entry point. React source lives in `extension/src/`. The built extension is output to `extension/dist/`, which is loaded in Chrome instead of the current `extension/` directory. shadcn/ui components (Radix UI + Tailwind CSS) replace all hand-rolled UI. Dark mode is forced via `class="dark"` on `<html>`.

**Tech Stack:** React 18, TypeScript 5, Vite 5, `vite-plugin-web-extension` v4, Tailwind CSS v3, shadcn/ui (new-york style), Radix UI primitives, Vitest + @testing-library/react

---

## Directory Layout After Migration

```
extension/
├── src/
│   ├── sidepanel/
│   │   ├── index.html       ← Vite entry HTML (replaces sidepanel.html)
│   │   ├── main.tsx         ← React entry point
│   │   ├── App.tsx          ← Root component with all state
│   │   └── app.css          ← Tailwind directives + shadcn CSS vars
│   ├── components/
│   │   ├── ui/              ← shadcn auto-generated (do not edit)
│   │   ├── Header.tsx
│   │   ├── SearchBar.tsx
│   │   ├── CollectionList.tsx
│   │   ├── CollectionItem.tsx
│   │   ├── BookmarkList.tsx
│   │   ├── BookmarkItem.tsx
│   │   ├── CurrentPage.tsx
│   │   ├── StatusBar.tsx
│   │   └── dialogs/
│   │       ├── NewCollectionDialog.tsx
│   │       ├── RenameCollectionDialog.tsx
│   │       ├── DeleteCollectionDialog.tsx
│   │       └── ScanWarningDialog.tsx
│   ├── hooks/
│   │   └── useDaemonStatus.ts
│   ├── lib/
│   │   └── utils.ts         ← shadcn cn() utility
│   ├── types.ts             ← API response types matching Pydantic schemas
│   └── api.ts               ← Typed wrapper around ../../shared/api.js
├── shared/api.js            ← UNCHANGED
├── background/service_worker.js  ← UNCHANGED
├── content/content_script.js     ← UNCHANGED
├── options/                 ← UNCHANGED (vanilla HTML/JS)
├── manifest.json            ← Updated: side_panel path → src/sidepanel/index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
└── postcss.config.js
```

---

### Task 1: Project Setup (package.json, Vite, TypeScript, Tailwind)

**Files:**
- Create: `extension/package.json`
- Create: `extension/vite.config.ts`
- Create: `extension/tsconfig.json`
- Create: `extension/tailwind.config.js`
- Create: `extension/postcss.config.js`

- [ ] **Step 1: Write package.json**

```json
{
  "name": "bookmark-context-extension",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite build --watch",
    "build": "vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.6",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/chrome": "^0.0.268",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.19",
    "jsdom": "^24.1.1",
    "postcss": "^8.4.39",
    "tailwindcss": "^3.4.6",
    "typescript": "^5.5.3",
    "vite": "^5.3.4",
    "vite-plugin-web-extension": "^4.1.1",
    "vitest": "^2.0.4"
  }
}
```

- [ ] **Step 2: Write vite.config.ts**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import webExtension from "vite-plugin-web-extension";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    webExtension({
      manifest: () => ({
        ...require("./manifest.json"),
        side_panel: { default_path: "sidepanel/index.html" },
      }),
    }),
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
  },
});
```

- [ ] **Step 3: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] },
    "types": ["chrome", "vitest/globals"]
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Write tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 5: Write postcss.config.js**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 6: Install dependencies**

```bash
cd extension
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 7: Verify vite-plugin-web-extension is available**

```bash
cd extension
node -e "import('vite-plugin-web-extension').then(m => console.log('ok', Object.keys(m)))"
```

Expected: prints `ok [ 'default', ... ]`

- [ ] **Step 8: Commit**

```bash
cd extension
git -C .. add extension/package.json extension/vite.config.ts extension/tsconfig.json extension/tailwind.config.js extension/postcss.config.js extension/package-lock.json
git -C .. commit -m "feat(extension): add Vite + React + Tailwind build infrastructure"
```

---

### Task 2: shadcn/ui Initialization + Component Installs

**Files:**
- Create: `extension/components.json`
- Create: `extension/src/lib/utils.ts`
- Create: `extension/src/sidepanel/app.css`
- Create: `extension/src/test-setup.ts`
- Create: `extension/src/components/ui/` (auto-generated by shadcn CLI)

- [ ] **Step 1: Write components.json**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/sidepanel/app.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

- [ ] **Step 2: Write src/lib/utils.ts**

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Install clsx + tailwind-merge:
```bash
cd extension && npm install clsx tailwind-merge
```

- [ ] **Step 3: Write src/sidepanel/app.css**

This provides Tailwind directives and shadcn/ui CSS variables tuned for the extension's dark indigo theme.

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 228 33% 14%;
    --foreground: 214 32% 91%;
    --card: 228 33% 16%;
    --card-foreground: 214 32% 91%;
    --popover: 228 33% 16%;
    --popover-foreground: 214 32% 91%;
    --primary: 239 84% 67%;
    --primary-foreground: 228 33% 14%;
    --secondary: 214 32% 91%;
    --secondary-foreground: 228 33% 14%;
    --muted: 228 20% 22%;
    --muted-foreground: 215 16% 47%;
    --accent: 228 25% 22%;
    --accent-foreground: 214 32% 91%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 214 32% 91%;
    --border: 228 20% 22%;
    --input: 228 20% 22%;
    --ring: 239 84% 67%;
    --radius: 0.5rem;
  }
}

@layer base {
  * { @apply border-border; }
  body { @apply bg-background text-foreground; }
}

body {
  font-size: 13px;
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
```

- [ ] **Step 4: Install shadcn/ui components via CLI**

```bash
cd extension
npx shadcn@latest add button input dialog dropdown-menu select badge scroll-area separator label
```

Expected: Files created in `src/components/ui/`: `button.tsx`, `input.tsx`, `dialog.tsx`, `dropdown-menu.tsx`, `select.tsx`, `badge.tsx`, `scroll-area.tsx`, `separator.tsx`, `label.tsx`. Also installs `@radix-ui/*` peer deps.

- [ ] **Step 5: Write src/test-setup.ts**

```typescript
import "@testing-library/jest-dom";
```

- [ ] **Step 6: Verify utils import works**

```bash
cd extension
node --input-type=module <<'EOF'
import { createRequire } from "module";
console.log("setup ok");
EOF
```

Expected: `setup ok`

- [ ] **Step 7: Commit**

```bash
git -C .. add extension/components.json extension/src/lib/utils.ts extension/src/sidepanel/app.css extension/src/test-setup.ts extension/src/components/ui/ extension/package.json extension/package-lock.json
git -C .. commit -m "feat(extension): add shadcn/ui components and CSS variables"
```

---

### Task 3: Types + Typed API Wrapper

**Files:**
- Create: `extension/src/types.ts`
- Create: `extension/src/api.ts`
- Test: `extension/src/api.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// extension/src/api.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../shared/api.js", () => ({
  api: {
    status: vi.fn(),
    listCollections: vi.fn(),
    createCollection: vi.fn(),
    deleteCollection: vi.fn(),
    updateCollection: vi.fn(),
    listBookmarks: vi.fn(),
    addBookmark: vi.fn(),
    deleteBookmark: vi.fn(),
    reindexBookmark: vi.fn(),
  },
}));

import { api } from "./api";
import { api as rawApi } from "../../shared/api.js";

describe("typed api wrapper", () => {
  beforeEach(() => vi.clearAllMocks());

  it("status() delegates to rawApi.status()", async () => {
    (rawApi.status as ReturnType<typeof vi.fn>).mockResolvedValue({ ai_backend: "openai" });
    const result = await api.status();
    expect(result.ai_backend).toBe("openai");
  });

  it("listCollections() returns typed Collection[]", async () => {
    const mockColl = { id: "1", name: "A", description: "", created_at: "", updated_at: "", bookmark_count: 0 };
    (rawApi.listCollections as ReturnType<typeof vi.fn>).mockResolvedValue([mockColl]);
    const result = await api.listCollections();
    expect(result[0].name).toBe("A");
  });

  it("addBookmark() passes force flag when true", async () => {
    (rawApi.addBookmark as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "b1", index_status: "pending" });
    await api.addBookmark("c1", "https://example.com", "Title", null, true);
    expect(rawApi.addBookmark).toHaveBeenCalledWith("c1", "https://example.com", "Title", null, true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd extension && npx vitest run src/api.test.ts
```

Expected: FAIL — `src/api.ts` does not exist yet.

- [ ] **Step 3: Write src/types.ts**

```typescript
export interface Collection {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  bookmark_count: number;
}

export interface Bookmark {
  id: string;
  collection_id: string;
  url: string;
  title: string;
  favicon_url: string;
  added_at: string;
  indexed_at: string | null;
  index_status: "pending" | "indexing" | "done" | "error";
  error_message: string | null;
}

export interface ScanWarning {
  status: "scan_warning";
  risk_score: number;
  signals: string[];
  matches: string[];
}

export interface DaemonStatus {
  ai_backend: string;
}
```

- [ ] **Step 4: Write src/api.ts**

```typescript
import { api as rawApi } from "../../shared/api.js";
import type { Collection, Bookmark, ScanWarning, DaemonStatus } from "./types";

export const api = {
  status: () => rawApi.status() as Promise<DaemonStatus>,
  listCollections: () => rawApi.listCollections() as Promise<Collection[]>,
  createCollection: (name: string, description = "") =>
    rawApi.createCollection(name, description) as Promise<Collection>,
  deleteCollection: (id: string) => rawApi.deleteCollection(id) as Promise<null>,
  updateCollection: (id: string, name: string, description = "") =>
    rawApi.updateCollection(id, name, description) as Promise<Collection>,
  listBookmarks: (collectionId: string) =>
    rawApi.listBookmarks(collectionId) as Promise<Bookmark[]>,
  addBookmark: (
    collectionId: string,
    url: string,
    title: string,
    html: string | null = null,
    force = false,
  ) => rawApi.addBookmark(collectionId, url, title, html, force) as Promise<Bookmark | ScanWarning>,
  deleteBookmark: (id: string) => rawApi.deleteBookmark(id) as Promise<null>,
  reindexBookmark: (id: string) => rawApi.reindexBookmark(id) as Promise<null>,
};
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd extension && npx vitest run src/api.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git -C .. add extension/src/types.ts extension/src/api.ts extension/src/api.test.ts
git -C .. commit -m "feat(extension): add TypeScript types and typed API wrapper"
```

---

### Task 4: App Shell — Entry HTML + main.tsx + App.tsx skeleton

**Files:**
- Create: `extension/src/sidepanel/index.html`
- Create: `extension/src/sidepanel/main.tsx`
- Create: `extension/src/sidepanel/App.tsx`
- Test: `extension/src/sidepanel/App.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// extension/src/sidepanel/App.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("../api", () => ({
  api: {
    status: vi.fn().mockRejectedValue(new Error("offline")),
    listCollections: vi.fn().mockResolvedValue([]),
  },
}));

// Chrome API stub
Object.assign(globalThis, {
  chrome: {
    tabs: { query: vi.fn().mockResolvedValue([{ title: "Test Page", url: "https://example.com" }]) },
    storage: { sync: { get: vi.fn().mockResolvedValue({ daemonPort: 7331 }) } },
  },
});

import App from "./App";

describe("App", () => {
  it("renders the header with logo text", async () => {
    render(<App />);
    expect(screen.getByText(/Bookmark Context/i)).toBeInTheDocument();
  });

  it("renders the status bar", async () => {
    render(<App />);
    expect(screen.getByText(/daemon/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd extension && npx vitest run src/sidepanel/App.test.tsx
```

Expected: FAIL — `App.tsx` doesn't exist yet.

- [ ] **Step 3: Write src/sidepanel/index.html**

```html
<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bookmark Context</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./main.tsx"></script>
</body>
</html>
```

- [ ] **Step 4: Write src/sidepanel/main.tsx**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import "./app.css";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 5: Write src/sidepanel/App.tsx skeleton**

```tsx
import { useState, useEffect, useCallback } from "react";
import { api } from "../api";
import type { Collection, Bookmark, ScanWarning } from "../types";
import Header from "../components/Header";
import SearchBar from "../components/SearchBar";
import CollectionList from "../components/CollectionList";
import BookmarkList from "../components/BookmarkList";
import CurrentPage from "../components/CurrentPage";
import StatusBar from "../components/StatusBar";
import NewCollectionDialog from "../components/dialogs/NewCollectionDialog";
import RenameCollectionDialog from "../components/dialogs/RenameCollectionDialog";
import DeleteCollectionDialog from "../components/dialogs/DeleteCollectionDialog";
import ScanWarningDialog from "../components/dialogs/ScanWarningDialog";

export default function App() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentTab, setCurrentTab] = useState<{ title: string; url: string } | null>(null);
  const [daemonOnline, setDaemonOnline] = useState<boolean | null>(null);
  const [daemonBackend, setDaemonBackend] = useState("");
  const [newCollectionOpen, setNewCollectionOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Collection | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Collection | null>(null);
  const [scanWarning, setScanWarning] = useState<ScanWarning | null>(null);
  const [pendingSave, setPendingSave] = useState<{
    collectionId: string; url: string; title: string; html: string | null;
  } | null>(null);

  const loadCollections = useCallback(async () => {
    try {
      const cols = await api.listCollections();
      setCollections(cols);
    } catch {
      // daemon offline
    }
  }, []);

  const checkDaemon = useCallback(async () => {
    try {
      const s = await api.status();
      setDaemonOnline(true);
      setDaemonBackend(s.ai_backend);
    } catch {
      setDaemonOnline(false);
      setDaemonBackend("");
    }
  }, []);

  useEffect(() => {
    checkDaemon();
    loadCollections();
    chrome.tabs
      .query({ active: true, currentWindow: true })
      .then(([tab]) => {
        if (tab) setCurrentTab({ title: tab.title || tab.url || "", url: tab.url || "" });
      });
    const interval = setInterval(checkDaemon, 10_000);
    return () => clearInterval(interval);
  }, [checkDaemon, loadCollections]);

  useEffect(() => {
    if (!selectedCollection) return;
    const load = () => api.listBookmarks(selectedCollection.id).then(setBookmarks).catch(() => {});
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [selectedCollection]);

  async function handleSelectCollection(coll: Collection) {
    setSelectedCollection(coll);
    const bms = await api.listBookmarks(coll.id);
    setBookmarks(bms);
  }

  async function handleAddBookmark(collectionId: string, html: string | null) {
    if (!currentTab) return;
    const result = await api.addBookmark(collectionId, currentTab.url, currentTab.title, html);
    if (result && "status" in result && result.status === "scan_warning") {
      setScanWarning(result as ScanWarning);
      setPendingSave({ collectionId, url: currentTab.url, title: currentTab.title, html });
      return;
    }
    await loadCollections();
  }

  async function handleForceSave() {
    if (!pendingSave) return;
    const { collectionId, url, title, html } = pendingSave;
    setPendingSave(null);
    setScanWarning(null);
    await api.addBookmark(collectionId, url, title, html, true);
    await loadCollections();
  }

  async function handleDeleteBookmark(id: string) {
    await api.deleteBookmark(id);
    if (selectedCollection) {
      const bms = await api.listBookmarks(selectedCollection.id);
      setBookmarks(bms);
      await loadCollections();
    }
  }

  async function handleReindexBookmark(id: string) {
    await api.reindexBookmark(id);
    if (selectedCollection) {
      const bms = await api.listBookmarks(selectedCollection.id);
      setBookmarks(bms);
    }
  }

  async function handleCollectionCreated() {
    setNewCollectionOpen(false);
    await loadCollections();
  }

  async function handleCollectionRenamed(updated: Collection) {
    setRenameTarget(null);
    await loadCollections();
    if (selectedCollection?.id === updated.id) setSelectedCollection(updated);
  }

  async function handleCollectionDeleted(id: string) {
    setDeleteTarget(null);
    if (selectedCollection?.id === id) {
      setSelectedCollection(null);
      setBookmarks([]);
    }
    await loadCollections();
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header onNewCollection={() => setNewCollectionOpen(true)} />
      <SearchBar value={searchQuery} onChange={setSearchQuery} />

      {selectedCollection ? (
        <BookmarkList
          collection={selectedCollection}
          bookmarks={bookmarks}
          onBack={() => { setSelectedCollection(null); setBookmarks([]); }}
          onRename={() => setRenameTarget(selectedCollection)}
          onDelete={() => setDeleteTarget(selectedCollection)}
          onDeleteBookmark={handleDeleteBookmark}
          onReindex={handleReindexBookmark}
        />
      ) : (
        <CollectionList
          collections={collections}
          searchQuery={searchQuery}
          onSelect={handleSelectCollection}
          onRename={setRenameTarget}
          onDelete={setDeleteTarget}
        />
      )}

      <CurrentPage currentTab={currentTab} collections={collections} onAdd={handleAddBookmark} />
      <StatusBar online={daemonOnline} backend={daemonBackend} />

      <NewCollectionDialog
        open={newCollectionOpen}
        onOpenChange={setNewCollectionOpen}
        onCreated={handleCollectionCreated}
      />
      {renameTarget && (
        <RenameCollectionDialog
          collection={renameTarget}
          open={true}
          onOpenChange={(o) => { if (!o) setRenameTarget(null); }}
          onRenamed={handleCollectionRenamed}
        />
      )}
      {deleteTarget && (
        <DeleteCollectionDialog
          collection={deleteTarget}
          open={true}
          onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
          onDeleted={handleCollectionDeleted}
        />
      )}
      {scanWarning && pendingSave && (
        <ScanWarningDialog
          warning={scanWarning}
          open={true}
          onDiscard={() => { setScanWarning(null); setPendingSave(null); }}
          onForce={handleForceSave}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 6: Run tests**

```bash
cd extension && npx vitest run src/sidepanel/App.test.tsx
```

Expected: PASS (2 tests) — components will be stub imports at this stage; the test only checks Header and StatusBar render.

Note: The test will fail until Task 5 components exist. That's OK — create minimal stub components temporarily:

```bash
mkdir -p extension/src/components/dialogs
for f in Header SearchBar CollectionList BookmarkList CurrentPage StatusBar; do
  echo "export default function $f() { return null; }" > extension/src/components/$f.tsx
done
for f in NewCollectionDialog RenameCollectionDialog DeleteCollectionDialog ScanWarningDialog; do
  echo "export default function $f() { return null; }" > extension/src/components/dialogs/$f.tsx
done
```

Then re-check Header renders "Bookmark Context" — update the Header stub:
```typescript
// extension/src/components/Header.tsx (temporary stub)
export default function Header({ onNewCollection }: { onNewCollection: () => void }) {
  return <header><span>📚 Bookmark Context</span></header>;
}
```

And StatusBar stub:
```typescript
// extension/src/components/StatusBar.tsx (temporary stub)
export default function StatusBar({ online, backend }: { online: boolean | null; backend: string }) {
  return <footer><span>daemon status</span></footer>;
}
```

- [ ] **Step 7: Run tests again**

```bash
cd extension && npx vitest run src/sidepanel/App.test.tsx
```

Expected: PASS (2 tests)

- [ ] **Step 8: Commit**

```bash
git -C .. add extension/src/sidepanel/ extension/src/components/
git -C .. commit -m "feat(extension): add React app shell and stub components"
```

---

### Task 5: Header + SearchBar + StatusBar

**Files:**
- Modify: `extension/src/components/Header.tsx`
- Modify: `extension/src/components/SearchBar.tsx`
- Modify: `extension/src/components/StatusBar.tsx`
- Test: `extension/src/components/Header.test.tsx`
- Test: `extension/src/components/SearchBar.test.tsx`
- Test: `extension/src/components/StatusBar.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// extension/src/components/Header.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import Header from "./Header";

describe("Header", () => {
  it("renders logo text", () => {
    render(<Header onNewCollection={vi.fn()} />);
    expect(screen.getByText(/Bookmark Context/i)).toBeInTheDocument();
  });

  it("renders settings link", () => {
    render(<Header onNewCollection={vi.fn()} />);
    expect(screen.getByTitle(/settings/i)).toBeInTheDocument();
  });
});
```

```tsx
// extension/src/components/SearchBar.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import SearchBar from "./SearchBar";

describe("SearchBar", () => {
  it("calls onChange with input value", async () => {
    const onChange = vi.fn();
    render(<SearchBar value="" onChange={onChange} />);
    await userEvent.type(screen.getByPlaceholderText(/search/i), "abc");
    expect(onChange).toHaveBeenLastCalledWith("abc");
  });
});
```

```tsx
// extension/src/components/StatusBar.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import StatusBar from "./StatusBar";

describe("StatusBar", () => {
  it("shows 'Daemon offline' when offline", () => {
    render(<StatusBar online={false} backend="" />);
    expect(screen.getByText(/offline/i)).toBeInTheDocument();
  });

  it("shows backend name when online", () => {
    render(<StatusBar online={true} backend="openai" />);
    expect(screen.getByText(/openai/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd extension && npx vitest run src/components/Header.test.tsx src/components/SearchBar.test.tsx src/components/StatusBar.test.tsx
```

Expected: FAIL (stubs return null, text not found)

- [ ] **Step 3: Implement Header.tsx**

```tsx
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface HeaderProps {
  onNewCollection: () => void;
}

export default function Header({ onNewCollection }: HeaderProps) {
  return (
    <>
      <header className="flex items-center justify-between px-3 py-2.5 bg-primary/10 flex-shrink-0">
        <span className="font-semibold text-sm">📚 Bookmark Context</span>
        <a
          href="../options/options.html"
          target="_blank"
          title="Settings"
          className="text-muted-foreground hover:text-foreground text-base leading-none"
        >
          ⚙
        </a>
      </header>
      <Separator />
    </>
  );
}
```

- [ ] **Step 4: Implement SearchBar.tsx**

```tsx
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export default function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="px-3 py-2 border-b border-border flex-shrink-0">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search collections…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-8 h-8 text-xs"
        />
      </div>
    </div>
  );
}
```

Install lucide-react (shadcn uses it):
```bash
cd extension && npm install lucide-react
```

- [ ] **Step 5: Implement StatusBar.tsx**

```tsx
import { cn } from "@/lib/utils";

interface StatusBarProps {
  online: boolean | null;
  backend: string;
}

export default function StatusBar({ online, backend }: StatusBarProps) {
  return (
    <footer className="flex items-center gap-1.5 px-3 py-1.5 border-t border-border text-[11px] text-muted-foreground flex-shrink-0">
      <span
        className={cn(
          "w-2 h-2 rounded-full flex-shrink-0",
          online === true ? "bg-green-500" : "bg-red-500",
        )}
      />
      <span>
        {online === true ? `Online · ${backend}` : "Daemon offline"}
      </span>
    </footer>
  );
}
```

- [ ] **Step 6: Run tests**

```bash
cd extension && npx vitest run src/components/Header.test.tsx src/components/SearchBar.test.tsx src/components/StatusBar.test.tsx
```

Expected: PASS (5 tests)

- [ ] **Step 7: Commit**

```bash
git -C .. add extension/src/components/Header.tsx extension/src/components/SearchBar.tsx extension/src/components/StatusBar.tsx extension/src/components/*.test.tsx extension/package.json extension/package-lock.json
git -C .. commit -m "feat(extension): add Header, SearchBar, StatusBar components"
```

---

### Task 6: CollectionList + CollectionItem (with DropdownMenu)

**Files:**
- Modify: `extension/src/components/CollectionList.tsx`
- Create: `extension/src/components/CollectionItem.tsx`
- Test: `extension/src/components/CollectionList.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// extension/src/components/CollectionList.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import CollectionList from "./CollectionList";
import type { Collection } from "../types";

const mockCollections: Collection[] = [
  { id: "1", name: "Research", description: "", created_at: "", updated_at: "", bookmark_count: 3 },
  { id: "2", name: "Recipes", description: "", created_at: "", updated_at: "", bookmark_count: 0 },
];

describe("CollectionList", () => {
  it("renders all collection names", () => {
    render(<CollectionList collections={mockCollections} searchQuery="" onSelect={vi.fn()} onRename={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("Research")).toBeInTheDocument();
    expect(screen.getByText("Recipes")).toBeInTheDocument();
  });

  it("shows bookmark count", () => {
    render(<CollectionList collections={mockCollections} searchQuery="" onSelect={vi.fn()} onRename={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("3 pages")).toBeInTheDocument();
  });

  it("filters by search query", () => {
    render(<CollectionList collections={mockCollections} searchQuery="rec" onSelect={vi.fn()} onRename={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.queryByText("Research")).not.toBeInTheDocument();
    expect(screen.getByText("Recipes")).toBeInTheDocument();
  });

  it("calls onSelect when row is clicked", async () => {
    const onSelect = vi.fn();
    render(<CollectionList collections={mockCollections} searchQuery="" onSelect={onSelect} onRename={vi.fn()} onDelete={vi.fn()} />);
    await userEvent.click(screen.getByText("Research"));
    expect(onSelect).toHaveBeenCalledWith(mockCollections[0]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd extension && npx vitest run src/components/CollectionList.test.tsx
```

Expected: FAIL

- [ ] **Step 3: Implement CollectionItem.tsx**

```tsx
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { Collection } from "../types";

interface CollectionItemProps {
  collection: Collection;
  onSelect: () => void;
  onRename: () => void;
  onDelete: () => void;
}

export default function CollectionItem({ collection, onSelect, onRename, onDelete }: CollectionItemProps) {
  return (
    <div className="flex items-center rounded-md px-2 py-1.5 mb-0.5 cursor-pointer hover:bg-accent group">
      <div className="flex-1 min-w-0" onClick={onSelect}>
        <span className="text-sm font-medium truncate block">🗂 {collection.name}</span>
      </div>
      <span className="text-[11px] text-muted-foreground mr-1 flex-shrink-0">
        {collection.bookmark_count} pages
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
            aria-label="Options"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onRename}>
            <Pencil className="mr-2 h-3.5 w-3.5" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
```

- [ ] **Step 4: Implement CollectionList.tsx**

```tsx
import { ScrollArea } from "@/components/ui/scroll-area";
import CollectionItem from "./CollectionItem";
import type { Collection } from "../types";

interface CollectionListProps {
  collections: Collection[];
  searchQuery: string;
  onSelect: (c: Collection) => void;
  onRename: (c: Collection) => void;
  onDelete: (c: Collection) => void;
}

export default function CollectionList({ collections, searchQuery, onSelect, onRename, onDelete }: CollectionListProps) {
  const lower = searchQuery.toLowerCase();
  const visible = searchQuery
    ? collections.filter((c) => c.name.toLowerCase().includes(lower))
    : collections;

  return (
    <section className="flex-1 overflow-hidden">
      <ScrollArea className="h-full">
        <div className="px-2 py-2">
          {visible.length === 0 && (
            <p className="text-[12px] text-muted-foreground px-2 py-3">
              {searchQuery ? "No collections match your search." : "No collections yet."}
            </p>
          )}
          {visible.map((c) => (
            <CollectionItem
              key={c.id}
              collection={c}
              onSelect={() => onSelect(c)}
              onRename={() => onRename(c)}
              onDelete={() => onDelete(c)}
            />
          ))}
        </div>
      </ScrollArea>
    </section>
  );
}
```

- [ ] **Step 5: Run tests**

```bash
cd extension && npx vitest run src/components/CollectionList.test.tsx
```

Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git -C .. add extension/src/components/CollectionList.tsx extension/src/components/CollectionItem.tsx extension/src/components/CollectionList.test.tsx
git -C .. commit -m "feat(extension): add CollectionList with DropdownMenu kebab"
```

---

### Task 7: BookmarkList + BookmarkItem

**Files:**
- Modify: `extension/src/components/BookmarkList.tsx`
- Create: `extension/src/components/BookmarkItem.tsx`
- Test: `extension/src/components/BookmarkList.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// extension/src/components/BookmarkList.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import BookmarkList from "./BookmarkList";
import type { Collection, Bookmark } from "../types";

const coll: Collection = { id: "c1", name: "Research", description: "", created_at: "", updated_at: "", bookmark_count: 1 };
const bookmarks: Bookmark[] = [
  { id: "b1", collection_id: "c1", url: "https://example.com", title: "Example", favicon_url: "", added_at: "", indexed_at: null, index_status: "done", error_message: null },
  { id: "b2", collection_id: "c1", url: "https://other.com", title: "Other", favicon_url: "", added_at: "", indexed_at: null, index_status: "error", error_message: null },
];

describe("BookmarkList", () => {
  it("renders collection name in header", () => {
    render(<BookmarkList collection={coll} bookmarks={bookmarks} onBack={vi.fn()} onRename={vi.fn()} onDelete={vi.fn()} onDeleteBookmark={vi.fn()} onReindex={vi.fn()} />);
    expect(screen.getByText("Research")).toBeInTheDocument();
  });

  it("renders bookmark titles", () => {
    render(<BookmarkList collection={coll} bookmarks={bookmarks} onBack={vi.fn()} onRename={vi.fn()} onDelete={vi.fn()} onDeleteBookmark={vi.fn()} onReindex={vi.fn()} />);
    expect(screen.getByText("Example")).toBeInTheDocument();
    expect(screen.getByText("Other")).toBeInTheDocument();
  });

  it("shows indexed status badge", () => {
    render(<BookmarkList collection={coll} bookmarks={bookmarks} onBack={vi.fn()} onRename={vi.fn()} onDelete={vi.fn()} onDeleteBookmark={vi.fn()} onReindex={vi.fn()} />);
    expect(screen.getByText(/indexed/i)).toBeInTheDocument();
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });

  it("calls onBack when back button clicked", async () => {
    const onBack = vi.fn();
    render(<BookmarkList collection={coll} bookmarks={[]} onBack={onBack} onRename={vi.fn()} onDelete={vi.fn()} onDeleteBookmark={vi.fn()} onReindex={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(onBack).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd extension && npx vitest run src/components/BookmarkList.test.tsx
```

Expected: FAIL

- [ ] **Step 3: Implement BookmarkItem.tsx**

```tsx
import { RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Bookmark } from "../types";

const STATUS_LABELS: Record<Bookmark["index_status"], string> = {
  done: "Indexed",
  pending: "Pending",
  indexing: "Indexing",
  error: "Error",
};

const STATUS_CLASSES: Record<Bookmark["index_status"], string> = {
  done: "bg-green-500/15 text-green-400 border-green-500/20",
  pending: "bg-primary/15 text-primary border-primary/20",
  indexing: "bg-primary/15 text-primary border-primary/20",
  error: "bg-destructive/15 text-destructive border-destructive/20",
};

interface BookmarkItemProps {
  bookmark: Bookmark;
  onDelete: () => void;
  onReindex: () => void;
}

export default function BookmarkItem({ bookmark, onDelete, onReindex }: BookmarkItemProps) {
  return (
    <div className="px-2 py-2 rounded-md mb-1 bg-card border border-border">
      <p className="text-sm font-medium truncate">{bookmark.title || bookmark.url}</p>
      <p className="text-[11px] text-muted-foreground truncate mt-0.5">{bookmark.url}</p>
      <div className="flex items-center gap-2 mt-1.5">
        <Badge variant="outline" className={cn("text-[10px] font-semibold px-1.5 py-0", STATUS_CLASSES[bookmark.index_status])}>
          {STATUS_LABELS[bookmark.index_status]}
        </Badge>
        <div className="flex gap-1 ml-auto">
          <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground" onClick={onReindex} title="Re-index">
            <RotateCcw className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-destructive" onClick={onDelete} title="Remove">
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Implement BookmarkList.tsx**

```tsx
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import BookmarkItem from "./BookmarkItem";
import type { Collection, Bookmark } from "../types";

interface BookmarkListProps {
  collection: Collection;
  bookmarks: Bookmark[];
  onBack: () => void;
  onRename: () => void;
  onDelete: () => void;
  onDeleteBookmark: (id: string) => void;
  onReindex: (id: string) => void;
}

export default function BookmarkList({ collection, bookmarks, onBack, onRename, onDelete, onDeleteBookmark, onReindex }: BookmarkListProps) {
  return (
    <section className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center gap-1 px-2 py-1.5 flex-shrink-0">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onBack} aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="flex-1 font-semibold text-sm truncate ml-1">{collection.name}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={onRename} title="Rename collection">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={onDelete} title="Delete collection">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <Separator />
      <ScrollArea className="flex-1">
        <div className="px-2 py-2">
          {bookmarks.length === 0 ? (
            <p className="text-[12px] text-muted-foreground px-2 py-3">
              No bookmarks yet. Add pages using the panel below.
            </p>
          ) : (
            bookmarks.map((b) => (
              <BookmarkItem
                key={b.id}
                bookmark={b}
                onDelete={() => onDeleteBookmark(b.id)}
                onReindex={() => onReindex(b.id)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </section>
  );
}
```

- [ ] **Step 5: Run tests**

```bash
cd extension && npx vitest run src/components/BookmarkList.test.tsx
```

Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git -C .. add extension/src/components/BookmarkList.tsx extension/src/components/BookmarkItem.tsx extension/src/components/BookmarkList.test.tsx
git -C .. commit -m "feat(extension): add BookmarkList with status badges"
```

---

### Task 8: CurrentPage Component

**Files:**
- Modify: `extension/src/components/CurrentPage.tsx`
- Test: `extension/src/components/CurrentPage.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// extension/src/components/CurrentPage.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import CurrentPage from "./CurrentPage";
import type { Collection } from "../types";

Object.assign(globalThis, {
  chrome: {
    scripting: {
      executeScript: vi.fn().mockResolvedValue([{ result: "<html></html>" }]),
    },
  },
});

const collections: Collection[] = [
  { id: "c1", name: "Research", description: "", created_at: "", updated_at: "", bookmark_count: 0 },
];

describe("CurrentPage", () => {
  it("shows page title when tab is set", () => {
    render(<CurrentPage currentTab={{ title: "My Page", url: "https://example.com" }} collections={collections} onAdd={vi.fn()} />);
    expect(screen.getByText("My Page")).toBeInTheDocument();
  });

  it("shows placeholder when no tab", () => {
    render(<CurrentPage currentTab={null} collections={collections} onAdd={vi.fn()} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("add button is disabled when no collection selected", () => {
    render(<CurrentPage currentTab={{ title: "P", url: "https://x.com" }} collections={collections} onAdd={vi.fn()} />);
    expect(screen.getByRole("button", { name: /add/i })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd extension && npx vitest run src/components/CurrentPage.test.tsx
```

Expected: FAIL

- [ ] **Step 3: Implement CurrentPage.tsx**

```tsx
import { useState } from "react";
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
      setTimeout(() => setAdded(false), 2000);
    } catch (e) {
      alert(`Failed to add bookmark: ${(e as Error).message}`);
    } finally {
      setAdding(false);
    }
  }

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
          disabled={!selectedCollectionId || adding}
          onClick={handleAdd}
        >
          {added ? "✓ Added" : adding ? "Adding…" : "+ Add to collection"}
        </Button>
      </section>
    </>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
cd extension && npx vitest run src/components/CurrentPage.test.tsx
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git -C .. add extension/src/components/CurrentPage.tsx extension/src/components/CurrentPage.test.tsx
git -C .. commit -m "feat(extension): add CurrentPage component with collection selector"
```

---

### Task 9: All Four Dialogs

**Files:**
- Modify: `extension/src/components/dialogs/NewCollectionDialog.tsx`
- Modify: `extension/src/components/dialogs/RenameCollectionDialog.tsx`
- Modify: `extension/src/components/dialogs/DeleteCollectionDialog.tsx`
- Modify: `extension/src/components/dialogs/ScanWarningDialog.tsx`
- Test: `extension/src/components/dialogs/dialogs.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// extension/src/components/dialogs/dialogs.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import NewCollectionDialog from "./NewCollectionDialog";
import RenameCollectionDialog from "./RenameCollectionDialog";
import DeleteCollectionDialog from "./DeleteCollectionDialog";
import ScanWarningDialog from "./ScanWarningDialog";
import type { Collection, ScanWarning } from "../../types";

vi.mock("../../api", () => ({
  api: {
    createCollection: vi.fn().mockResolvedValue({ id: "new", name: "My Coll", description: "", created_at: "", updated_at: "", bookmark_count: 0 }),
    updateCollection: vi.fn().mockResolvedValue({ id: "c1", name: "Renamed", description: "", created_at: "", updated_at: "", bookmark_count: 2 }),
    deleteCollection: vi.fn().mockResolvedValue(null),
  },
}));

const coll: Collection = { id: "c1", name: "Research", description: "desc", created_at: "", updated_at: "", bookmark_count: 5 };

describe("NewCollectionDialog", () => {
  it("renders when open", () => {
    render(<NewCollectionDialog open={true} onOpenChange={vi.fn()} onCreated={vi.fn()} />);
    expect(screen.getByPlaceholderText(/collection name/i)).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<NewCollectionDialog open={false} onOpenChange={vi.fn()} onCreated={vi.fn()} />);
    expect(screen.queryByPlaceholderText(/collection name/i)).not.toBeInTheDocument();
  });

  it("calls onCreated after creating", async () => {
    const { api } = await import("../../api");
    const onCreated = vi.fn();
    render(<NewCollectionDialog open={true} onOpenChange={vi.fn()} onCreated={onCreated} />);
    await userEvent.type(screen.getByPlaceholderText(/collection name/i), "My Coll");
    await userEvent.click(screen.getByRole("button", { name: /create/i }));
    expect(api.createCollection).toHaveBeenCalledWith("My Coll", "");
    expect(onCreated).toHaveBeenCalled();
  });
});

describe("RenameCollectionDialog", () => {
  it("pre-fills the collection name", () => {
    render(<RenameCollectionDialog open={true} collection={coll} onOpenChange={vi.fn()} onRenamed={vi.fn()} />);
    expect(screen.getByDisplayValue("Research")).toBeInTheDocument();
  });
});

describe("DeleteCollectionDialog", () => {
  it("shows collection name and count", () => {
    render(<DeleteCollectionDialog open={true} collection={coll} onOpenChange={vi.fn()} onDeleted={vi.fn()} />);
    expect(screen.getByText(/Research/)).toBeInTheDocument();
    expect(screen.getByText(/5/)).toBeInTheDocument();
  });
});

describe("ScanWarningDialog", () => {
  const warning: ScanWarning = { status: "scan_warning", risk_score: 0.85, signals: ["xss"], matches: ["<script>alert(1)</script>"] };

  it("shows risk score", () => {
    render(<ScanWarningDialog open={true} warning={warning} onDiscard={vi.fn()} onForce={vi.fn()} />);
    expect(screen.getByText(/0.85/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd extension && npx vitest run src/components/dialogs/dialogs.test.tsx
```

Expected: FAIL

- [ ] **Step 3: Implement NewCollectionDialog.tsx**

```tsx
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { api } from "../../api";

interface NewCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export default function NewCollectionDialog({ open, onOpenChange, onCreated }: NewCollectionDialogProps) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await api.createCollection(trimmed, desc.trim());
      setName("");
      setDesc("");
      onOpenChange(false);
      onCreated();
    } catch (e) {
      alert(`Failed to create collection: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-72">
        <DialogHeader>
          <DialogTitle>New Collection</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs">Collection name</Label>
            <Input
              placeholder="Collection name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 h-8 text-xs"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
          <div>
            <Label className="text-xs">Description (optional)</Label>
            <Input
              placeholder="Description"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="mt-1 h-8 text-xs"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleCreate} disabled={!name.trim() || saving}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Implement RenameCollectionDialog.tsx**

```tsx
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { api } from "../../api";
import type { Collection } from "../../types";

interface RenameCollectionDialogProps {
  open: boolean;
  collection: Collection;
  onOpenChange: (open: boolean) => void;
  onRenamed: (updated: Collection) => void;
}

export default function RenameCollectionDialog({ open, collection, onOpenChange, onRenamed }: RenameCollectionDialogProps) {
  const [name, setName] = useState(collection.name);
  const [desc, setDesc] = useState(collection.description);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(collection.name);
      setDesc(collection.description);
    }
  }, [open, collection]);

  async function handleUpdate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const updated = await api.updateCollection(collection.id, trimmed, desc.trim());
      onOpenChange(false);
      onRenamed(updated);
    } catch (e) {
      alert(`Failed to rename: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-72">
        <DialogHeader>
          <DialogTitle>Rename Collection</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs">Collection name</Label>
            <Input
              placeholder="Collection name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 h-8 text-xs"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleUpdate()}
            />
          </div>
          <div>
            <Label className="text-xs">Description (optional)</Label>
            <Input
              placeholder="Description"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="mt-1 h-8 text-xs"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleUpdate} disabled={!name.trim() || saving}>Update</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 5: Implement DeleteCollectionDialog.tsx**

```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { api } from "../../api";
import type { Collection } from "../../types";
import { useState } from "react";

interface DeleteCollectionDialogProps {
  open: boolean;
  collection: Collection;
  onOpenChange: (open: boolean) => void;
  onDeleted: (id: string) => void;
}

export default function DeleteCollectionDialog({ open, collection, onOpenChange, onDeleted }: DeleteCollectionDialogProps) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.deleteCollection(collection.id);
      onOpenChange(false);
      onDeleted(collection.id);
    } catch (e) {
      alert(`Failed to delete: ${(e as Error).message}`);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-72">
        <DialogHeader>
          <DialogTitle>Delete Collection</DialogTitle>
        </DialogHeader>
        <div className="py-2 text-sm text-muted-foreground">
          <p>Delete <strong className="text-foreground">{collection.name}</strong>?</p>
          <p className="mt-1 text-destructive text-xs">
            This will permanently remove {collection.bookmark_count} saved page(s).
          </p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 6: Implement ScanWarningDialog.tsx**

```tsx
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
```

- [ ] **Step 7: Run tests**

```bash
cd extension && npx vitest run src/components/dialogs/dialogs.test.tsx
```

Expected: PASS (7 tests)

- [ ] **Step 8: Commit**

```bash
git -C .. add extension/src/components/dialogs/
git -C .. commit -m "feat(extension): add all four dialog components (New, Rename, Delete, ScanWarning)"
```

---

### Task 10: Update manifest + Build Verification + Chrome Load Test

**Files:**
- Modify: `extension/manifest.json`
- Modify: `extension/vite.config.ts` (finalize manifest override)
- No test file — this task is build + manual load verification

This task wires everything together: updates the manifest so `vite-plugin-web-extension` knows the side panel entry point, does a full build, and verifies the extension loads in Chrome.

- [ ] **Step 1: Update manifest.json side_panel path**

Change `"side_panel": { "default_path": "sidepanel/sidepanel.html" }` to point to the Vite-built output. With `vite-plugin-web-extension`, the manifest is used as a source and the plugin rewrites paths in the output. Update the manifest to use the src path:

```json
{
  "manifest_version": 3,
  "name": "Bookmark Context",
  "version": "0.1.0",
  "description": "Organise bookmarks into collections and ask questions about them in Cursor.",
  "permissions": [
    "contextMenus",
    "sidePanel",
    "activeTab",
    "tabs",
    "scripting",
    "storage"
  ],
  "host_permissions": [
    "http://localhost:7331/*"
  ],
  "background": {
    "service_worker": "background/service_worker.js",
    "type": "module"
  },
  "side_panel": {
    "default_path": "src/sidepanel/index.html"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/content_script.js"],
      "run_at": "document_idle"
    }
  ],
  "options_page": "options/options.html",
  "action": {
    "default_title": "Open Bookmark Context"
  }
}
```

- [ ] **Step 2: Finalize vite.config.ts**

The `vite-plugin-web-extension` reads `manifest.json` directly. Remove the inline manifest override — let it read the file:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import webExtension from "vite-plugin-web-extension";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    webExtension(),
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
  },
});
```

- [ ] **Step 3: Run full build**

```bash
cd extension && npm run build
```

Expected: `dist/` directory created with `manifest.json`, `sidepanel/index.html` (or similar), JS chunks, CSS file. No errors.

If build fails due to TypeScript errors, fix them before proceeding. Common issues:
- Missing `chrome` types — already handled by `@types/chrome` in tsconfig
- Import errors in api.ts — verify the relative path `../../shared/api.js` resolves correctly from `extension/src/`

If `shared/api.js` path doesn't resolve correctly from `src/api.ts`, add a Vite alias:
```typescript
// in vite.config.ts resolve.alias
"@shared": path.resolve(__dirname, "./shared"),
```
And update `src/api.ts` to `import { api as rawApi } from "@shared/api.js"`.

- [ ] **Step 4: Run all tests to confirm nothing regressed**

```bash
cd extension && npm test
```

Expected: All tests pass.

- [ ] **Step 5: Load extension in Chrome**

1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `extension/dist/` directory
5. Open side panel — verify:
   - Header shows "📚 Bookmark Context" and settings gear
   - Search bar renders
   - Collections load (if daemon running)
   - Daemon status shows in footer
   - New collection dialog opens from header button
   - Kebab menu appears on hover over collection rows
   - Clicking a collection shows bookmarks view with back/rename/delete buttons
   - Add to collection flow works

- [ ] **Step 6: Remove old sidepanel files (now replaced by src/)**

```bash
rm extension/sidepanel/sidepanel.html extension/sidepanel/sidepanel.js extension/sidepanel/sidepanel.css
git -C .. rm extension/sidepanel/sidepanel.html extension/sidepanel/sidepanel.js extension/sidepanel/sidepanel.css
```

- [ ] **Step 7: Final commit**

```bash
git -C .. add extension/manifest.json extension/vite.config.ts
git -C .. commit -m "feat(extension): complete React+Vite+shadcn migration, remove old vanilla files"
```

---

## Running the Dev Build

```bash
cd extension
npm run dev       # watch mode — rebuilds on file changes
# then reload extension in chrome://extensions/
```

## Chrome Loading Instructions

After `npm run build`, load `extension/dist/` in Chrome (not `extension/`).
