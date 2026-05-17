export type Theme = "light" | "dark" | "system";

export type ResolvedTheme = "light" | "dark";

const DEFAULT_THEME: Theme = "dark";

export function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme;
}

export function applyTheme(theme: Theme): void {
  const resolved = resolveTheme(theme);
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

export async function getStoredTheme(): Promise<Theme> {
  const { theme } = await chrome.storage.sync.get({ theme: DEFAULT_THEME });
  if (theme === "light" || theme === "dark" || theme === "system") return theme;
  return DEFAULT_THEME;
}

export async function setStoredTheme(theme: Theme): Promise<void> {
  await chrome.storage.sync.set({ theme });
}

export function watchSystemTheme(onChange: () => void): () => void {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => onChange();
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}
