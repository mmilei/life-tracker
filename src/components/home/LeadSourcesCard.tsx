import type * as React from "react";
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/store/AppStore";
import { sourceLabel } from "@/lib/leads";

// Where the leads come from, as a ranked bar list. It is a panel and not a
// pinnable KPI because the answer is a distribution, not one number: the grid
// above shows single figures, this one only means something as a whole.
export function LeadSourcesCard(): React.JSX.Element {
  const { notes, leadConfig, t } = useAppStore();
  const { sources } = leadConfig;

  // Leads with no source are excluded from the bars on purpose: bucketing them
  // as "unknown" would make the biggest bar the one the owner can't act on.
  // They still show in the counter, which is what tells him data is missing.
  const ranked = useMemo(() => {
    const counts = new Map<string, number>();
    for (const note of notes.leads) {
      const id = note.lead?.source?.trim();
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return [...counts].sort((a, b) => b[1] - a[1]);
  }, [notes.leads]);

  const total = notes.leads.length;
  // Bars are a share of the leads that have a source, not a share of the leader.
  // Scaling against the leader filled every bar to 100% whenever the sources were
  // tied, which is the most common shape early on (one referral, one showroom) and
  // exactly when the panel should be earning its space: identical full bars say
  // nothing. Against the total the same data reads 50/50, which is both true and
  // the question the panel asks, since "where they come from" is a proportion and
  // the ranking is already carried by the order. Many sources do make short bars,
  // but a stub with its count printed next to it is honest, and a full bar that
  // lies is not.
  const withSource = ranked.reduce((sum, [, count]) => sum + count, 0);

  return (
    // The span lives here and not in HomeTab because the signature takes no
    // props: it is the third card of a two-column band, so it goes full width
    // there instead of leaving a hole, and lines up as a column at lg.
    <Card size="sm" className="gap-3 px-4 sm:col-span-2 lg:col-span-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t("home.leadSources")}
        </span>
        {ranked.length > 0 && (
          <Badge variant="secondary" className="tabular-nums">
            {t("home.leadSourcesCount", { n: withSource, total })}
          </Badge>
        )}
      </div>

      {ranked.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("home.leadSourcesEmpty")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {ranked.map(([id, count]) => (
            <li key={id} className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                <span className="truncate">{sourceLabel(sources, id) ?? id}</span>
                <span className="tabular-nums text-foreground">{count}</span>
              </div>
              {/* Decorative: the number next to the label already says it, so a
                  screen reader gains nothing from reading the bar too. */}
              <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <div
                  className="h-full rounded-full bg-ember"
                  style={{ width: `${(count / withSource) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
