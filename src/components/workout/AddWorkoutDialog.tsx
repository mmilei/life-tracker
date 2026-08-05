import { useState } from "react";
import { Plus } from "lucide-react";
import type { MuscleGroup, Workout } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { todayISO } from "@/lib/dates";
import { useT } from "@/store/AppStore";

interface AddWorkoutDialogProps {
  muscleGroups: MuscleGroup[];
  exercises: string[]; // distinct names already logged, for the datalist
  onAdd: (w: Omit<Workout, "id">) => void;
}

// Small labelled number field — native <input type="number"> gives us the
// steppers for free (plan: nada que la plataforma ya resuelva).
function NumberField({
  label,
  value,
  onChange,
  min = 0,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  step?: number;
}) {
  return (
    <label className="flex flex-1 flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Input
        type="number"
        inputMode="decimal"
        min={min}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
        className="text-center tabular-nums"
      />
    </label>
  );
}

export function AddWorkoutDialog({ muscleGroups, exercises, onAdd }: AddWorkoutDialogProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayISO());
  const [muscleGroupId, setMuscleGroupId] = useState(muscleGroups[0]?.id ?? "");
  const [exercise, setExercise] = useState("");
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [weight, setWeight] = useState(20);

  function submit() {
    const trimmed = exercise.trim();
    if (!trimmed || !muscleGroupId) return;
    onAdd({ date, muscleGroupId, exercise: trimmed, sets, reps, weight });
    setExercise("");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" className="w-full" />}>
        <Plus />
        {t("workout.add")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("workout.newTitle")}</DialogTitle>
          <DialogDescription>{t("workout.newDescription")}</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          {/* Muscle group — single-select ToggleGroup (base-ui is array-valued) */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">{t("workout.muscleGroup")}</span>
            <ToggleGroup
              value={muscleGroupId ? [muscleGroupId] : []}
              onValueChange={(v) => v[0] && setMuscleGroupId(v[0])}
              variant="outline"
              className="flex-wrap"
            >
              {muscleGroups.map((g) => (
                <ToggleGroupItem key={g.id} value={g.id} className="px-3">
                  {g.name}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">{t("workout.exercise")}</span>
            <Input
              autoFocus
              list="workout-exercises"
              value={exercise}
              onChange={(e) => setExercise(e.target.value)}
              placeholder={t("workout.exercisePlaceholder")}
            />
            <datalist id="workout-exercises">
              {exercises.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </label>

          <div className="flex gap-3">
            <NumberField label={t("workout.sets")} value={sets} onChange={setSets} min={1} />
            <NumberField label={t("workout.reps")} value={reps} onChange={setReps} min={1} />
            <NumberField label={t("workout.weight")} value={weight} onChange={setWeight} step={0.5} />
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">{t("workout.date")}</span>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
        </form>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>{t("common.cancel")}</DialogClose>
          <Button onClick={submit} disabled={!exercise.trim() || !muscleGroupId}>
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
