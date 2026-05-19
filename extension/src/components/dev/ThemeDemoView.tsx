import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { THEME_SWATCH_GROUPS, themeTokenCssVar } from "@/lib/themeTokens";
import { useThemeTokenValue } from "@/lib/useThemeTokenValue";

interface ThemeDemoViewProps {
  onBack: () => void;
}

function Swatch({
  name,
  bgClass,
  fgClass,
  cssVar,
}: {
  name: string;
  bgClass: string;
  fgClass?: string;
  cssVar: string;
}) {
  const oklch = useThemeTokenValue(cssVar);

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div
        className={cn(
          "flex h-12 items-center justify-center rounded-md border border-border text-sm font-medium",
          bgClass,
          fgClass,
        )}
      >
        Aa
      </div>
      <span className="truncate text-[10px] font-medium text-foreground">{name}</span>
      <span className="break-all font-mono text-[9px] leading-tight text-muted-foreground">
        {oklch || "—"}
      </span>
    </div>
  );
}

export default function ThemeDemoView({ onBack }: ThemeDemoViewProps) {
  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-1 px-3 py-1.5">
        <Button variant="ghost" size="icon-sm" onClick={onBack} aria-label="Back">
          <ArrowLeft />
        </Button>
        <h2 className="text-sm font-medium">Theme demo</h2>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-5 p-3 pb-4">
          {THEME_SWATCH_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="mb-2 text-xs font-medium">{group.title}</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {group.swatches.map((swatch) => (
                  <Swatch
                    key={swatch.name}
                    name={swatch.name}
                    bgClass={swatch.bgClass}
                    fgClass={swatch.fgClass}
                    cssVar={swatch.cssVar ?? themeTokenCssVar(swatch.name)}
                  />
                ))}
              </div>
            </div>
          ))}

          <div>
            <h3 className="mb-2 text-xs font-medium">Components</h3>
            <div className="flex flex-wrap gap-2">
              <Button variant="default" size="sm">
                Default
              </Button>
              <Button variant="secondary" size="sm">
                Secondary
              </Button>
              <Button variant="outline" size="sm">
                Outline
              </Button>
              <Button variant="ghost" size="sm">
                Ghost
              </Button>
              <Button variant="destructive" size="sm">
                Destructive
              </Button>
            </div>
          </div>
        </div>
      </ScrollArea>
    </section>
  );
}
