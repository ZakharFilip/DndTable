import { Link, useLocation } from "react-router-dom";
import type { LoadStatus } from "../hooks/useTableData";
import type { SyncStatus } from "../../../tabletop/realtime/TableSync";

interface SessionChromeProps {
  loadStatus: LoadStatus;
  syncStatus: SyncStatus;
  onFlushNow: () => void;
  onOpenTeams: () => void;
  teamsOpen: boolean;
}

function statusLabel(loadStatus: LoadStatus, syncStatus: SyncStatus): string | null {
  if (loadStatus === "loading") return "Загрузка…";
  if (loadStatus === "error") return "Ошибка загрузки";
  if (syncStatus === "syncing") return "Синхронизация…";
  if (syncStatus === "conflict") return "Конфликт версий";
  if (syncStatus === "error") return "Ошибка синхронизации";
  return null;
}

function statusColor(loadStatus: LoadStatus, syncStatus: SyncStatus): string {
  if (loadStatus === "error" || syncStatus === "error") return "var(--color-error)";
  if (syncStatus === "conflict") return "var(--color-warning)";
  return "var(--color-text-secondary)";
}

export function SessionChrome({
  loadStatus,
  syncStatus,
  onFlushNow,
  onOpenTeams,
  teamsOpen,
}: SessionChromeProps) {
  const location = useLocation();
  const returnTo =
    (location.state as { returnTo?: string } | null)?.returnTo ?? "/sessions";
  const status = statusLabel(loadStatus, syncStatus);
  const loaded = loadStatus === "loaded";

  return (
    <div className="st-chrome">
      <Link to={returnTo} className="st-hud-btn" title="Назад">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </Link>

      <button
        type="button"
        onClick={onOpenTeams}
        className={`st-hud-btn${teamsOpen ? " st-hud-btn--active" : ""}`}
        title="Команды"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      </button>

      {status && (
        <span
          className="st-hud-btn st-hud-btn--wide"
          style={{ color: statusColor(loadStatus, syncStatus) }}
        >
          {status}
        </span>
      )}

      <button
        type="button"
        onClick={onFlushNow}
        disabled={!loaded}
        className="st-hud-btn st-hud-btn--success st-hud-btn--sync"
        style={{ opacity: loaded ? 1 : 0.5 }}
        title="Синхронизировать"
      >
        Sync
      </button>
    </div>
  );
}
