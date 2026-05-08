import { Link } from "react-router-dom";
import type { LoadStatus } from "../hooks/useTableData";
import type { SyncStatus } from "../../../tabletop/realtime/TableSync";

interface TableHeaderProps {
  id: string | undefined;
  loadStatus: LoadStatus;
  syncStatus: SyncStatus;
  onFlushNow: () => void;
}

export function TableHeader({ id, loadStatus, syncStatus, onFlushNow }: TableHeaderProps) {
  return (
    <header className="shrink-0 flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
      <div className="flex items-center gap-4">
        <Link
          to="/sessions"
          className="text-sm text-indigo-600 hover:text-indigo-700 underline-offset-2 hover:underline"
        >
          ← К списку сессий
        </Link>
        <span className="text-gray-600 text-sm">Сессия {id || ""}</span>
        {loadStatus === "loading" && <span className="text-gray-500 text-sm">Загрузка…</span>}
        {loadStatus === "error" && <span className="text-red-600 text-sm">Ошибка загрузки</span>}
        {syncStatus === "syncing" && <span className="text-gray-500 text-sm">Синхронизация…</span>}
        {syncStatus === "conflict" && (
          <span className="text-amber-600 text-sm">Конфликт версий, обновляю…</span>
        )}
        {syncStatus === "error" && (
          <span className="text-red-600 text-sm">Ошибка синхронизации</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onFlushNow}
          disabled={loadStatus !== "loaded"}
          className="px-3 py-1.5 rounded bg-emerald-600 text-white text-sm hover:bg-emerald-500 disabled:opacity-50"
        >
          Синхронизировать
        </button>
      </div>
    </header>
  );
}
