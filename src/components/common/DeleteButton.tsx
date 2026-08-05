import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useT } from "@/store/AppStore";
import { cn } from "@/lib/utils";

// Shared confirm-to-delete affordance: icon button + AlertDialog.
// First common destructive control in the project — habits, workouts and
// notes reuse this instead of re-implementing the confirmation flow.
interface DeleteButtonProps {
  onConfirm: () => void;
  itemName?: string; // shown in the confirmation body (common.deleteConfirm)
  title?: string;
  description?: string;
  className?: string;
}

export function DeleteButton({
  onConfirm,
  itemName,
  title,
  description,
  className,
}: DeleteButtonProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const resolvedTitle = title ?? t("common.deleteTitle");
  const body =
    description ??
    (itemName ? t("common.deleteConfirm", { name: itemName }) : t("common.deleteUndone"));

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={itemName ? t("common.deleteAria", { name: itemName }) : t("common.delete")}
            className={cn("text-muted-foreground hover:text-destructive", className)}
          />
        }
      >
        <Trash2 />
      </AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{resolvedTitle}</AlertDialogTitle>
          <AlertDialogDescription>{body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
          >
            {t("common.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
