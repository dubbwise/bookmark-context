import { useEffect, useState } from "react";
import { readThemeTokenValue } from "./themeTokens";

/** Resolved token value from `:root` / `.dark` (e.g. `oklch(...)`). Updates when theme class changes. */
export function useThemeTokenValue(cssVar: string): string {
  const [value, setValue] = useState(() => readThemeTokenValue(cssVar));

  useEffect(() => {
    const update = () => setValue(readThemeTokenValue(cssVar));
    update();

    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", update);

    return () => {
      observer.disconnect();
      mq.removeEventListener("change", update);
    };
  }, [cssVar]);

  return value;
}
