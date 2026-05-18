export interface ThemeSwatch {
  name: string;
  bgClass: string;
  fgClass?: string;
  /** CSS custom property, e.g. `--primary`. Defaults to `--${name}`. */
  cssVar?: string;
}

export function themeTokenCssVar(name: string): string {
  return `--${name}`;
}

export function readThemeTokenValue(cssVar: string): string {
  if (typeof document === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
}

export interface ThemeSwatchGroup {
  title: string;
  swatches: ThemeSwatch[];
}

export const THEME_SWATCH_GROUPS: ThemeSwatchGroup[] = [
  {
    title: "Core",
    swatches: [
      { name: "background", bgClass: "bg-background", fgClass: "text-foreground" },
      { name: "foreground", bgClass: "bg-foreground", fgClass: "text-background" },
      { name: "card", bgClass: "bg-card", fgClass: "text-card-foreground" },
      { name: "popover", bgClass: "bg-popover", fgClass: "text-popover-foreground" },
      { name: "primary", bgClass: "bg-primary", fgClass: "text-primary-foreground" },
      { name: "secondary", bgClass: "bg-secondary", fgClass: "text-secondary-foreground" },
      { name: "muted", bgClass: "bg-muted", fgClass: "text-muted-foreground" },
      { name: "accent", bgClass: "bg-accent", fgClass: "text-accent-foreground" },
      { name: "destructive", bgClass: "bg-destructive", fgClass: "text-white" },
      { name: "border", bgClass: "bg-border", fgClass: "text-foreground" },
      { name: "input", bgClass: "bg-input", fgClass: "text-foreground" },
      { name: "ring", bgClass: "bg-ring", fgClass: "text-foreground" },
    ],
  },
  {
    title: "Charts",
    swatches: [
      { name: "chart-1", bgClass: "bg-chart-1", fgClass: "text-foreground" },
      { name: "chart-2", bgClass: "bg-chart-2", fgClass: "text-foreground" },
      { name: "chart-3", bgClass: "bg-chart-3", fgClass: "text-foreground" },
      { name: "chart-4", bgClass: "bg-chart-4", fgClass: "text-foreground" },
      { name: "chart-5", bgClass: "bg-chart-5", fgClass: "text-foreground" },
    ],
  },
  {
    title: "Sidebar",
    swatches: [
      { name: "sidebar", bgClass: "bg-sidebar", fgClass: "text-sidebar-foreground" },
      {
        name: "sidebar-primary",
        bgClass: "bg-sidebar-primary",
        fgClass: "text-sidebar-primary-foreground",
      },
      { name: "sidebar-accent", bgClass: "bg-sidebar-accent", fgClass: "text-sidebar-accent-foreground" },
      { name: "sidebar-border", bgClass: "bg-sidebar-border", fgClass: "text-foreground" },
      { name: "sidebar-ring", bgClass: "bg-sidebar-ring", fgClass: "text-foreground" },
    ],
  },
];
