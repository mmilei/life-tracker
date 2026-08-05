import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/AppStore";
import { LANGS, type Lang } from "@/lib/i18n";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export interface NavItem {
  id: string;
  titleKey: string; // i18n key, e.g. "nav.week" — resolved here, not by the caller
  icon: LucideIcon;
}

interface SidebarProps {
  items: NavItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}

// Desktop vertical nav (Notion/Linear pattern): icon + label buttons,
// active item gets a subtle background. Replaces the mobile BottomNav from iteration 1.
export function Sidebar({ items, value, onChange, className }: SidebarProps) {
  const { lang, setLang, t } = useAppStore();

  return (
    <aside
      className={cn(
        "flex h-dvh w-60 shrink-0 flex-col gap-6 border-r border-border bg-sidebar px-4 py-6",
        className
      )}
    >
      <h1 className="px-2 font-display text-2xl font-semibold tracking-tight">
        {t("nav.appTitle")}
      </h1>

      <nav aria-label={t("nav.sections")} className="flex flex-col gap-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          const selected = value === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={selected ? "page" : undefined}
              onClick={() => onChange(item.id)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{t(item.titleKey)}</span>
            </button>
          );
        })}
      </nav>

      {/* Language switch, pinned to the foot of the sidebar. Same single-select
          ToggleGroup pattern the workout/business tabs use (base-ui is array-valued). */}
      <ToggleGroup
        aria-label={t("nav.language")}
        value={[lang]}
        onValueChange={(v) => v[0] && setLang(v[0] as Lang)}
        variant="outline"
        size="sm"
        className="mt-auto self-start"
      >
        {LANGS.map((l) => (
          <ToggleGroupItem key={l} value={l} className="px-2.5 uppercase">
            {l}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </aside>
  );
}
