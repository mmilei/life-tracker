import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDayLong } from "@/lib/dates";
import { useT } from "@/store/AppStore";
import type { LifeArea, WeeklyRating } from "@/types";

interface WeekHistoryProps {
  weeks: string[]; // all rated weeks, newest first (includes current)
  currentWeekStart: string;
  getWeek: (ws: string) => WeeklyRating[];
  areas: LifeArea[];
}

export function WeekHistory({ weeks, currentWeekStart, getWeek, areas }: WeekHistoryProps) {
  const t = useT();
  const past = weeks.filter((w) => w !== currentWeekStart);
  if (past.length === 0) return null;

  const nameOf = (areaId: string) =>
    areas.find((a) => a.id === areaId)?.name ?? t("week.deletedArea");

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        {t("week.history")}
      </h2>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {past.map((ws) => {
        const ratings = getWeek(ws);
        const avg = ratings.reduce((s, r) => s + r.score, 0) / ratings.length;
        return (
          <Card key={ws} size="sm" className="gap-2 px-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{t("week.weekOf", { date: formatDayLong(ws) })}</span>
              <Badge variant="secondary" className="font-display tabular-nums">
                {avg.toFixed(1)}
              </Badge>
            </div>
            <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
              {ratings.map((r) => (
                <li key={r.areaId} className="flex items-center justify-between gap-2">
                  <span className="truncate">{nameOf(r.areaId)}</span>
                  <span className="tabular-nums text-foreground">{r.score}</span>
                </li>
              ))}
            </ul>
          </Card>
        );
      })}
      </div>
    </section>
  );
}
