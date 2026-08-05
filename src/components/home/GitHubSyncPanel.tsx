import { useState, useSyncExternalStore } from "react";
import { RefreshCw, Settings } from "lucide-react";
import { Card } from "@/components/ui/card";
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
import { getLocale } from "@/lib/dates";
import { DEFAULT_FOLDER, loadConfig, normalizeConfig, type SyncErrorCode } from "@/lib/sync";
import { applySyncConfig, getSyncStatus, subscribeSyncStatus, syncNow } from "@/lib/sync-engine";
import { useT } from "@/store/AppStore";

const ERROR_KEYS: Record<SyncErrorCode, string> = {
  auth: "sync.errorAuth",
  notFound: "sync.errorNotFound",
  conflict: "sync.errorConflict",
  corrupt: "sync.errorCorrupt",
  network: "sync.errorNetwork",
  unknown: "sync.errorUnknown",
};

function Field({
  label,
  value,
  onChange,
  placeholder,
  type,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function SettingsDialog() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const saved = loadConfig();
  const [token, setToken] = useState(saved?.token ?? "");
  const [repo, setRepo] = useState(saved?.repo ?? "");
  const [path, setPath] = useState(saved?.path ?? DEFAULT_FOLDER);

  const cfg = normalizeConfig({ token, repo, path });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <Settings />
        {t("sync.configure")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("sync.settingsTitle")}</DialogTitle>
          <DialogDescription>{t("sync.settingsDescription")}</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!cfg) return;
            applySyncConfig(cfg);
            setOpen(false);
          }}
        >
          <Field
            label={t("sync.token")}
            type="password"
            value={token}
            onChange={setToken}
            placeholder={t("sync.tokenPlaceholder")}
          />
          <Field
            label={t("sync.repo")}
            value={repo}
            onChange={setRepo}
            placeholder={t("sync.repoPlaceholder")}
          />
          <Field
            label={t("sync.path")}
            value={path}
            onChange={setPath}
            placeholder={t("sync.pathPlaceholder")}
          />
          {!cfg && (token || repo) && (
            <p className="text-xs text-destructive">{t("sync.invalidConfig")}</p>
          )}
          <p className="text-xs text-muted-foreground">{t("sync.tokenHint")}</p>
        </form>
        <DialogFooter>
          {saved && (
            <Button
              variant="outline"
              onClick={() => {
                applySyncConfig(null);
                setToken("");
                setRepo("");
                setPath(DEFAULT_FOLDER);
                setOpen(false);
              }}
            >
              {t("sync.disconnect")}
            </Button>
          )}
          <DialogClose render={<Button variant="outline" />}>{t("common.cancel")}</DialogClose>
          <Button
            disabled={!cfg}
            onClick={() => {
              if (!cfg) return;
              applySyncConfig(cfg);
              setOpen(false);
            }}
          >
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Status + settings for the GitHub backup. The sync itself runs in
// src/lib/sync-engine.ts, started by AppStoreProvider — this panel only
// reports it, and reports failures instead of hiding them.
export function GitHubSyncPanel() {
  const t = useT();
  const status = useSyncExternalStore(subscribeSyncStatus, getSyncStatus);
  const failed = status.state === "error";

  const statusText =
    status.state === "off"
      ? t("sync.stateOff")
      : status.state === "syncing"
        ? t("sync.stateSyncing")
        : status.state === "synced"
          ? t("sync.stateSynced", { time: new Date(status.at).toLocaleString(getLocale()) })
          : t(ERROR_KEYS[status.code]);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {t("sync.title")}
      </h2>
      <Card size="sm" className="gap-3 px-4">
        <p className={failed ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
          {statusText}
        </p>
        {failed && <p className="text-xs text-muted-foreground">{t("sync.errorHint")}</p>}
        <div className="flex flex-wrap gap-2">
          <SettingsDialog />
          <Button
            variant="outline"
            disabled={status.state === "off" || status.state === "syncing"}
            onClick={() => void syncNow()}
          >
            <RefreshCw />
            {t("sync.syncNow")}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{t("sync.description")}</p>
      </Card>
    </section>
  );
}
