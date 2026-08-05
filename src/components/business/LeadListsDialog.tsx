import { useState } from "react";
import { Check, Pencil, Plus, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeleteButton } from "@/components/common/DeleteButton";
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
import { MAX_STAGES, canAddStage, isFixedStage, nameTaken, stageLabel } from "@/lib/leads";
import { useAppStore, useT } from "@/store/AppStore";

// The two lists that shape the lead board: pipeline stages and lead sources.
// One dialog for both, because they are edited in the same moment ("the way I
// sell changed") and two separate entry points would only split that moment in
// half.

// A row in either list: read-only until the pencil is pressed, then an inline
// input. Fixed rows say so instead of showing controls that do nothing.
function ListRow({
  label,
  fixed,
  onRename,
  deleteDescription,
  onRemove,
}: {
  label: string;
  fixed?: boolean;
  onRename: (label: string) => void;
  deleteDescription: string;
  onRemove: () => void;
}) {
  const t = useT();
  const [draft, setDraft] = useState<string | null>(null); // null = not editing

  function save() {
    const name = (draft ?? "").trim();
    if (name) onRename(name);
    setDraft(null);
  }

  if (draft !== null) {
    return (
      <li className="flex items-center gap-1.5">
        <Input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setDraft(null);
          }}
        />
        <Button size="icon-sm" aria-label={t("common.save")} onClick={save} disabled={!draft.trim()}>
          <Check />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("common.cancel")}
          onClick={() => setDraft(null)}
        >
          <X />
        </Button>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-2">
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {fixed ? (
        <span className="text-xs text-muted-foreground">{t("business.stageFixed")}</span>
      ) : (
        <>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("business.rename", { name: label })}
            className="text-muted-foreground"
            onClick={() => setDraft(label)}
          >
            <Pencil />
          </Button>
          <DeleteButton itemName={label} description={deleteDescription} onConfirm={onRemove} />
        </>
      )}
    </li>
  );
}

// Input + button to append to a list. `note` is why the button is off, and it
// is always rendered next to the disabled button: a greyed control with no
// reason reads as a broken app.
function AddRow({
  placeholder,
  addLabel,
  note,
  canAdd,
  onAdd,
}: {
  placeholder: string;
  addLabel: string;
  note?: string;
  canAdd: (name: string) => boolean;
  onAdd: (name: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const allowed = canAdd(draft);

  function add() {
    if (!allowed) return;
    onAdd(draft.trim());
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder={placeholder}
          disabled={Boolean(note)}
        />
        <Button size="sm" onClick={add} disabled={!allowed}>
          <Plus />
          {addLabel}
        </Button>
      </div>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

export function LeadListsDialog(): React.JSX.Element {
  const t = useT();
  const { leadConfig } = useAppStore();
  const { stages, sources } = leadConfig;
  const firstLabel = stages[0] ? stageLabel(stages[0], t) : "";
  const lastLabel = stages.length > 0 ? stageLabel(stages[stages.length - 1], t) : "";
  // NOTE: no key for the combined dialog, so it is named after the two lists
  // it holds. Two nouns joined by a separator reads the same in es and en.
  const title = `${t("business.stages")} · ${t("business.sources")}`;
  const atLimit = !canAddStage(stages);
  // Compare against what is on screen, not against the stored ids: the fixed
  // stages render from the dictionary, so their id is not what the user reads.
  const stageNames = stages.map((s) => stageLabel(s, t));
  const sourceNames = sources.map((s) => s.label);

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <SlidersHorizontal />
        {title}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {t("business.stagesDescription", { first: firstLabel, last: lastLabel })}
          </DialogDescription>
        </DialogHeader>

        <section className="flex flex-col gap-3">
          <h3 className="font-medium">{t("business.stagesTitle")}</h3>
          <ul className="flex flex-col gap-1.5">
            {stages.map((stage) => (
              <ListRow
                key={stage.id}
                label={stageLabel(stage, t)}
                fixed={isFixedStage(stage.id)}
                onRename={(label) => leadConfig.renameStage(stage.id, label)}
                deleteDescription={t("business.stageDeleteConfirm", {
                  name: stageLabel(stage, t),
                  first: firstLabel,
                })}
                onRemove={() => leadConfig.removeStage(stage.id)}
              />
            ))}
          </ul>
          <AddRow
            placeholder={t("business.stagePlaceholder")}
            addLabel={t("business.stageAdd")}
            note={atLimit ? t("business.stageLimit", { n: MAX_STAGES }) : undefined}
            // Duplicate names would give the board two columns the user cannot
            // tell apart, and there is no reorder to fix it afterwards.
            canAdd={(name) => !atLimit && Boolean(name.trim()) && !nameTaken(stageNames, name)}
            onAdd={leadConfig.addStage}
          />
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="font-medium">{t("business.sourcesTitle")}</h3>
          <p className="text-sm text-muted-foreground">{t("business.sourcesDescription")}</p>
          <ul className="flex flex-col gap-1.5">
            {sources.map((source) => (
              <ListRow
                key={source.id}
                label={source.label}
                onRename={(label) => leadConfig.renameSource(source.id, label)}
                deleteDescription={t("business.sourceDeleteConfirm", { name: source.label })}
                onRemove={() => leadConfig.removeSource(source.id)}
              />
            ))}
          </ul>
          <AddRow
            placeholder={t("business.sourcePlaceholder")}
            addLabel={t("business.sourceAdd")}
            canAdd={(name) => Boolean(name.trim()) && !nameTaken(sourceNames, name)}
            onAdd={leadConfig.addSource}
          />
        </section>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>{t("common.done")}</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
