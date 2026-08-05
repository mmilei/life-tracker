import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/store/AppStore";
import { formatDayLong } from "@/lib/dates";

// Current-week rating snapshot: per-area scores + average. Mirrors WeekHistory's
// row style but for the live week (WeekHistory only lists past weeks).
export function WeeklySummaryCard() {
  const { weeklyRatings, lifeAreas, t } = useAppStore();
  const ws = weeklyRatings.currentWeekStart;
  const ratings = weeklyRatings.getWeek(ws);
  const nameOf = (id: string) =>
    lifeAreas.areas.find((a) => a.id === id)?.name ?? t("week.deletedArea");

  return (
    <Card size="sm" className="gap-3 px-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t("week.weekOf", { date: formatDayLong(ws) })}
        </span>
        {ratings.length > 0 && (
          <Badge variant="secondary" className="font-display tabular-nums">
            {(ratings.reduce((s, r) => s + r.score, 0) / ratings.length).toFixed(1)}
          </Badge>
        )}
      </div>

      {ratings.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("home.notRated")}</p>
      ) : (
        <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
          {ratings.map((r) => (
            <li key={r.areaId} className="flex items-center justify-between gap-2">
              <span className="truncate">{nameOf(r.areaId)}</span>
              <span className="tabular-nums text-foreground">{r.score}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
