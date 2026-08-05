import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { ColorPicker, SWATCHES } from "@/components/common/ColorPicker";
import { useT } from "@/store/AppStore";

// One visible character, counted correctly even for multi-code-unit emoji
// (surrogate pairs, ZWJ family/skin-tone sequences): `.length` counts UTF-16
// units, which would reject valid single emoji. Intl.Segmenter is a native
// platform feature, no dependency needed.
const grapheme = new Intl.Segmenter(undefined, { granularity: "grapheme" });
function countGraphemes(s: string): number {
  return [...grapheme.segment(s)].length;
}

export function AddHabitDialog({
  onAdd,
}: {
  onAdd: (name: string, color: string, emoji?: string) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [color, setColor] = useState(SWATCHES[0]);

  // Live cap at one grapheme: a value that segments to more than one is
  // rejected outright (previous value kept), covering both "typed a second
  // character" and "pasted a whole word" the same way.
  function handleEmojiChange(v: string) {
    if (countGraphemes(v) <= 1) setEmoji(v);
  }

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed, color, emoji || undefined);
    setName("");
    setEmoji("");
    setColor(SWATCHES[0]);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" className="w-full" />}>
        <Plus />
        {t("habits.add")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("habits.newTitle")}</DialogTitle>
          <DialogDescription>{t("habits.newDescription")}</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="flex gap-2">
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("habits.namePlaceholder")}
              className="flex-1"
            />
            <Input
              value={emoji}
              onChange={(e) => handleEmojiChange(e.target.value)}
              placeholder="🙂"
              aria-label={t("habits.emojiLabel")}
              className="w-14 text-center"
            />
          </div>
          <ColorPicker value={color} onChange={setColor} />
        </form>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>{t("common.cancel")}</DialogClose>
          <Button onClick={submit} disabled={!name.trim()}>
            {t("common.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
