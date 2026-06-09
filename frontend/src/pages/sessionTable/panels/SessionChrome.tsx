import { Link } from "react-router-dom";
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

export function SessionChrome({
  loadStatus,
  syncStatus,
  onFlushNow,
  onOpenTeams,
  teamsOpen,
}: SessionChromeProps) {
  const status = statusLabel(loadStatus, syncStatus);
  const loaded = loadStatus === "loaded";

  return (
    <div className="st-chrome">
      <Link to="/sessions" className="st-hud-btn" title="К списку сессий">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </Link>

      <button
        type="button"
        onClick={onOpenTeams}
        className="st-hud-btn"
        style={
          teamsOpen
            ? { background: "#4f46e5", color: "#fff", borderColor: "#4338ca" }
            : undefined
        }
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
          className="st-hud-btn"
          style={{
            width: "auto",
            padding: "0 10px",
            fontSize: 12,
            color:
              loadStatus === "error" || syncStatus === "error"
                ? "#dc2626"
                : syncStatus === "conflict"
                  ? "#d97706"
                  : "#4b5563",
          }}
        >
          {status}
        </span>
      )}

      <button
        type="button"
        onClick={onFlushNow}
        disabled={!loaded}
        className="st-hud-btn"
        style={{
          width: "auto",
          padding: "0 12px",
          fontSize: 13,
          background: "#059669",
          color: "#fff",
          borderColor: "#047857",
          opacity: loaded ? 1 : 0.5,
        }}
        title="Синхронизировать"
      >
        Sync
      </button>
    </div>
  );
}
