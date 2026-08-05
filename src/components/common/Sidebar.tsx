import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { PanelLeftClose, PanelLeftOpen, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/AppStore";
import { STORAGE_KEYS, useLocalStorage } from "@/lib/storage";
import { LANGS, type Lang } from "@/lib/i18n";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export interface NavItem {
  id: string;
  titleKey: string; // i18n key, e.g. "nav.week", resolved here, not by the caller
  icon: LucideIcon;
}

interface SidebarProps {
  items: NavItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}

// Below Tailwind's `lg` (64rem) the 15rem sidebar and a usable content column
// stop fitting together: the lead board and the habit grid already run out of
// room there with the sidebar open. Deliberately the same number as the CSS
// breakpoint, so the stylesheet and this hook can never disagree about where
// "narrow" starts.
const NARROW_QUERY = "(max-width: 63.9375rem)";

// Module scope: useSyncExternalStore re-subscribes whenever this identity
// changes, and an inline arrow would change on every render.
const subscribeNarrow = (onChange: () => void) => {
  const mql = window.matchMedia(NARROW_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
};

function useIsNarrow(): boolean {
  return useSyncExternalStore(
    subscribeNarrow,
    () => window.matchMedia(NARROW_QUERY).matches,
    () => false
  );
}

// Desktop vertical nav (Notion/Linear pattern): icon + label buttons,
// active item gets a subtle background.
//
// Collapse rules, in precedence order:
//   - narrow window  -> always the icon rail, whatever the saved preference says
//   - wide window    -> the saved preference decides
//   - opening it while narrow -> overlay on top of the content, never a layout column
// Only one thing is persisted (`collapsed`), and a narrow window never writes to
// it. That is what makes the round trip lossless: open it by hand, shrink the
// window and it becomes an overlay, widen it again and it comes back exactly as
// it was left.
export function Sidebar({ items, value, onChange, className }: SidebarProps) {
  const { lang, setLang, t } = useAppStore();
  const [collapsed, setCollapsed] = useLocalStorage(STORAGE_KEYS.sidebarCollapsed, false);
  const narrow = useIsNarrow();
  // Ephemeral on purpose: widening the window drops it and the saved preference
  // takes over again.
  const [overlayOpen, setOverlayOpen] = useState(false);

  const expanded = narrow ? overlayOpen : !collapsed;
  const overlay = narrow && overlayOpen;

  const close = useCallback(() => setOverlayOpen(false), []);
  const toggle = () =>
    narrow ? setOverlayOpen((open) => !open) : setCollapsed((c) => !c);

  // Escape dismisses the overlay: the backdrop is mouse-only, keyboard users
  // need a way out that is not tabbing through the whole nav.
  useEffect(() => {
    if (!overlay) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOverlayOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [overlay]);

  return (
    <>
      {overlay && (
        <div
          className="fixed inset-0 z-40 bg-foreground/40"
          onClick={close}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "sticky top-0 flex h-dvh shrink-0 flex-col gap-6 border-r border-border bg-sidebar py-6",
          "transition-[width] duration-200 motion-reduce:transition-none",
          expanded ? "w-60 px-4" : "w-14 px-2",
          className,
          // Structural, so it wins over anything the caller passes.
          overlay && "fixed inset-y-0 left-0 z-50"
        )}
      >
        <div className={cn("flex items-center gap-1", expanded ? "px-2" : "justify-center")}>
          {expanded && (
            <h1 className="min-w-0 flex-1 truncate font-display text-2xl font-semibold tracking-tight">
              {t("nav.appTitle")}
            </h1>
          )}
          <button
            type="button"
            onClick={toggle}
            aria-expanded={expanded}
            aria-label={t("nav.toggleSidebar")}
            title={t("nav.toggleSidebar")}
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors",
              "hover:bg-sidebar-accent/60 hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
          >
            {expanded ? (
              <PanelLeftClose className="size-4" aria-hidden="true" />
            ) : (
              <PanelLeftOpen className="size-4" aria-hidden="true" />
            )}
          </button>
        </div>

        <nav aria-label={t("nav.sections")} className="flex flex-col gap-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            const selected = value === item.id;
            const label = t(item.titleKey);
            return (
              <button
                key={item.id}
                type="button"
                aria-current={selected ? "page" : undefined}
                title={expanded ? undefined : label}
                onClick={() => {
                  onChange(item.id);
                  close(); // navigating dismisses the overlay
                }}
                className={cn(
                  "flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  expanded ? "px-3" : "justify-center px-0",
                  selected
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {/* sr-only rather than unmounted: the rail keeps its accessible name. */}
                <span className={cn("truncate", !expanded && "sr-only")}>{label}</span>
              </button>
            );
          })}
        </nav>

        {/* Language switch, pinned to the foot of the sidebar. Two side-by-side
            items do not fit the rail, and it is one tap away by expanding. */}
        {expanded && (
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
        )}
      </aside>

      {/* The overlaid aside is out of flow, so main would widen by the rail and
          the content would shift underneath it. This holds the slot. */}
      {overlay && <div className="w-14 shrink-0" aria-hidden="true" />}
    </>
  );
}
