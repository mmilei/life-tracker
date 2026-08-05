import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { exportBackup, importBackup } from "@/lib/storage";
import { useT } from "@/store/AppStore";

// Export/import of the entire localStorage as JSON. No backend: this is the
// only backup mechanism. Inline confirmation (useState + setTimeout) instead
// of a toast lib — the import already reloads the page, so only the export and
// errors need feedback.
export function BackupControls() {
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);

  const flash = (text: string, error = false) => {
    setMsg({ text, error });
    setTimeout(() => setMsg(null), 4000);
  };

  const onExport = () => {
    const blob = new Blob([exportBackup()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `life-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    flash(t("home.backupExported"));
  };

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    try {
      importBackup(await file.text()); // reloads the page when done
    } catch {
      flash(t("home.importError"), true);
    }
  };

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {t("home.backup")}
      </h2>
      <Card size="sm" className="gap-3 px-4">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onExport}>
            <Download />
            {t("home.exportBackup")}
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload />
            {t("home.importBackup")}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            onChange={onImportFile}
            className="hidden"
          />
        </div>
        {msg && (
          <p className={msg.error ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
            {msg.text}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {t("home.importWarning")}
        </p>
      </Card>
    </section>
  );
}
