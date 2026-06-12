import { useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import type { LoadStatus } from "../hooks/useTableData";
import type { SyncStatus } from "../../../tabletop/realtime/TableSync";

interface SessionChromeProps {
  loadStatus: LoadStatus;
  syncStatus: SyncStatus;
  onFlushNow: () => void;
  onOpenTeams: () => void;
  teamsOpen: boolean;
  onOpenInspector?: () => void;
  inspectorOpen?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onDelete?: () => void;
  canDelete?: boolean;
  onAddPhoto?: (file: File) => void;
  isCoarsePointer?: boolean;
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
  if (loadStatus === "error" || syncStatus === "error") return "var(--ds-color-error)";
  if (syncStatus === "conflict") return "var(--ds-color-warning)";
  return "var(--ds-color-text-secondary)";
}

export function SessionChrome({
  loadStatus,
  syncStatus,
  onFlushNow,
  onOpenTeams,
  teamsOpen,
  onOpenInspector,
  inspectorOpen,
  onUndo,
  onRedo,
  onDelete,
  canDelete,
  onAddPhoto,
  isCoarsePointer,
}: SessionChromeProps) {
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
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

      {isCoarsePointer && onOpenInspector && (
        <button
          type="button"
          onClick={onOpenInspector}
          className={`st-hud-btn${inspectorOpen ? " st-hud-btn--active" : ""}`}
          title="Свойства"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
        </button>
      )}

      {onUndo && (
        <button type="button" onClick={onUndo} className="st-hud-btn" title="Отменить">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 7v6h6M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6.36 2.64L3 13" />
          </svg>
        </button>
      )}

      {onRedo && (
        <button type="button" onClick={onRedo} className="st-hud-btn" title="Повторить">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 7v6h-6M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6.36 2.64L21 13" />
          </svg>
        </button>
      )}

      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          disabled={!canDelete}
          className="st-hud-btn"
          title="Удалить"
          style={{ opacity: canDelete ? 1 : 0.4 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      )}

      {isCoarsePointer && onAddPhoto && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onAddPhoto(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            className="st-hud-btn"
            title="Добавить фото"
            onClick={() => fileInputRef.current?.click()}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </button>
        </>
      )}

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
        <span>Sync</span>
      </button>
    </div>
  );
}
