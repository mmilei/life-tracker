import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StreakFlame } from "@/components/common/StreakFlame";
import { useAppStore } from "@/store/AppStore";
import { todayISO } from "@/lib/dates";
import { cn } from "@/lib/utils";

// Quick-toggle today's habits. Writes through the same useHabits store instance,
// so a toggle here shows up on the Habits tab without a reload (Context single-source test).
export function TodayChecklist() {
  const { habits, t } = useAppStore();
  const today = todayISO();

  return (
    <Card size="sm" className="gap-3 px-4">
      <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {t("home.todayHabits")}
      </span>

      {habits.habits.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("home.noHabits")}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {habits.habits.map((h) => {
            const done = habits.isDone(h.id, today);
            return (
              <li key={h.id}>
                <button
                  type="button"
                  onClick={() => habits.toggleLog(h.id, today)}
                  aria-pressed={done}
                  aria-label={`${h.name}${done ? ` (${t("common.completed")})` : ""}`}
                  className="flex w-full items-center gap-2.5 text-left"
                >
                  <span
                    className={cn(
                      // Circle, matching the month grid cell in HabitRow: ticking a
                      // habit is one gesture and it should not have two shapes.
                      "grid size-6 shrink-0 place-items-center rounded-full border transition-colors",
                      done
                        ? "border-transparent bg-mint text-white"
                        : "border-border/60 hover:bg-muted",
                    )}
                  >
                    {done && <Check className="size-4" strokeWidth={3} />}
                  </span>
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: h.color }}
                    aria-hidden="true"
                  />
                  <span className={cn("truncate text-sm", done && "text-muted-foreground line-through")}>
                    {h.name}
                  </span>
                  <StreakFlame count={habits.streaks[h.id] ?? 0} className="ml-auto shrink-0" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
