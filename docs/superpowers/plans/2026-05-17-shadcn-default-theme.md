# shadcn/ui Default Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the custom dark-indigo CSS variable theme with the default shadcn/ui zinc theme (light + dark).

**Architecture:** All shadcn component colours are driven by CSS custom properties in a single `@layer base` block in `app.css`. Swapping those values is the only change needed — Tailwind config, components, and HTML are all untouched because the variable *names* (`--primary`, `--background`, etc.) are identical in the default theme.

**Tech Stack:** Tailwind CSS v3, shadcn/ui new-york style, CSS custom properties, `darkMode: ["class"]` with `class="dark"` forced on `<html>`.

---

### Task 1: Replace CSS variables with shadcn/ui default zinc theme

The extension forces dark mode via `class="dark"` on `<html lang="en" class="dark">` in `extension/src/sidepanel/index.html`. The theme system works by declaring light vars in `:root` and overriding them in `.dark`. Only `extension/src/sidepanel/app.css` changes.

**Files:**
- Modify: `extension/src/sidepanel/app.css`

---

- [ ] **Step 1: Open `app.css` and read the current content**

The file is at `extension/src/sidepanel/app.css`. Current content:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 228 33% 14%;
    --foreground: 214 32% 91%;
    /* … custom indigo values … */
  }

  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
  }
}

body {
  font-size: 13px;
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
```

---

- [ ] **Step 2: Replace the entire file with the default shadcn/ui zinc theme**

Write `extension/src/sidepanel/app.css` with this exact content:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 3.9%;
    --primary: 240 5.9% 10%;
    --primary-foreground: 0 0% 98%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 240 5.9% 10%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    --card: 240 10% 3.9%;
    --card-foreground: 0 0% 98%;
    --popover: 240 10% 3.9%;
    --popover-foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 240 5.9% 10%;
    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;
    --accent: 240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 240 4.9% 83.9%;
    --radius: 0.5rem;
  }

  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
  }
}

body {
  font-size: 13px;
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
```

Key differences from the custom theme:
- `:root` now holds **light** (white/zinc) values instead of custom dark-indigo values
- `.dark` holds the **shadcn default dark** (near-black zinc) values — this block is what the extension actually uses since `<html class="dark">` is hardcoded
- `--primary` in dark mode is `0 0% 98%` (near-white), not the custom indigo `239 84% 67%`
- `--background` in dark mode is `240 10% 3.9%` (very dark neutral), not `228 33% 14%` (dark indigo)

---

- [ ] **Step 3: Build and verify no errors**

```bash
cd extension && npm run build
```

Expected: build completes with no errors, `dist/` updated.

---

- [ ] **Step 4: Run tests to confirm no regressions**

```bash
cd extension && npm test
```

Expected: 28/28 tests pass (theme change has no effect on behaviour tests).

---

- [ ] **Step 5: Commit**

```bash
git add extension/src/sidepanel/app.css
git commit -m "feat(extension): switch to default shadcn/ui zinc theme"
```
