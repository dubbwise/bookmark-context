# Settings Drawer

**Date:** 2026-05-17
**Status:** Approved

## Summary

Replace the broken "open options page in new tab" settings button with a bottom-sheet drawer that opens inside the sidebar. The drawer lets the user configure the daemon port without leaving the side panel.

## Context

The gear icon in `Header.tsx` previously linked to `../options/options.html` with `target="_blank"`. That path resolves incorrectly given the built file layout (`src/sidepanel/index.html` → `src/options/options.html` instead of `options/options.html`), so the link was dead. The fix already landed as `chrome.runtime.openOptionsPage()`, but the product direction is to keep settings in-panel via a drawer.

The shared API (`extension/shared/api.js`) already reads `daemonPort` from `chrome.storage.sync` on every request, so saving a new port takes effect immediately with no extra wiring.

## Architecture

```
App
 ├── Header          (onSettings prop added)
 ├── ... (existing views)
 └── SettingsDrawer  (new, open/onOpenChange props)
```

State lives in `App.tsx` as `settingsOpen / setSettingsOpen`, matching the pattern used for `newCollectionOpen` and the dialog targets.

## Components

### `components/ui/drawer.tsx` (new)

Installed via `npx shadcn@latest add drawer`, which adds `vaul` as a dependency. Exports: `Drawer`, `DrawerTrigger`, `DrawerContent`, `DrawerHeader`, `DrawerTitle`, `DrawerFooter`, `DrawerClose`. No custom logic — pure shadcn scaffold.

### `components/SettingsDrawer.tsx` (new)

Props: `open: boolean`, `onOpenChange: (open: boolean) => void`

Behaviour:
- On open (`useEffect` on `open`): reads `chrome.storage.sync.get('daemonPort')`, populates a controlled number input (default 7331).
- Save button: writes `chrome.storage.sync.set({ daemonPort })`, briefly shows "Saved ✓" for 2 s via local state, then resets.
- Input is `type="number"` with `min={1}` `max={65535}`.
- Drawer direction: bottom (vaul default). Dismissed by clicking the scrim or swiping down.

### `components/Header.tsx` (modified)

- Add `onSettings: () => void` to `HeaderProps`.
- Replace the `<button onClick={() => chrome.runtime.openOptionsPage()}>` with `<button onClick={onSettings}>`.

### `sidepanel/App.tsx` (modified)

- Add `const [settingsOpen, setSettingsOpen] = useState(false)`.
- Pass `onSettings={() => setSettingsOpen(true)}` to `<Header>`.
- Render `<SettingsDrawer open={settingsOpen} onOpenChange={setSettingsOpen} />` alongside the existing dialogs.

## Styling

`SettingsDrawer` uses the existing shadcn/ui design tokens (zinc dark theme). The drawer handle, title, input, and save button all use existing component primitives (`Input`, `Button`) and Tailwind classes consistent with the rest of the panel.

## Out of Scope

- Adding new settings fields (the existing options page only has daemon port; keep it at one field for now).
- Removing or redirecting the `options/options.html` page — leave it in place so `chrome.runtime.openOptionsPage()` still works for users who access it via the extension's context menu.
