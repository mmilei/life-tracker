import { useAppStore, useT } from "@/store/AppStore";
import { formatDayLong } from "@/lib/dates";
import { AreaRatingCard } from "./AreaRatingCard";
import { AddAreaDialog } from "./AddAreaDialog";
import { WeekHistory } from "./WeekHistory";

export function WeekTab() {
  const t = useT();
  const { lifeAreas, weeklyRatings } = useAppStore();
  const ws = weeklyRatings.currentWeekStart;
  const thisWeek = weeklyRatings.getWeek(ws);
  const scoreOf = (areaId: string) =>
    thisWeek.find((r) => r.areaId === areaId)?.score;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t("week.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("week.weekOf", { date: formatDayLong(ws) })}
        </p>
      </header>

      <section className="flex flex-col gap-3">
        {lifeAreas.areas.length === 0 && (
          <p className="text-sm text-muted-foreground">{t("week.empty")}</p>
        )}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {lifeAreas.areas.map((area) => (
            <AreaRatingCard
              key={area.id}
              area={area}
              score={scoreOf(area.id)}
              onRate={(score) => weeklyRatings.setRating(ws, area.id, score)}
              onDelete={() => lifeAreas.removeArea(area.id)}
            />
          ))}
        </div>
        <AddAreaDialog onAdd={lifeAreas.addArea} />
      </section>

      <WeekHistory
        weeks={weeklyRatings.weeks}
        currentWeekStart={ws}
        getWeek={weeklyRatings.getWeek}
        areas={lifeAreas.areas}
      />
    </div>
  );
}
