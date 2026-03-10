import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getMySessions } from "../api/sessions";
import type { GameSessionDto } from "../api/sessions";

export default function SessionsListPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<GameSessionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getMySessions();
        if (!cancelled) setSessions(res.data.sessions);
      } catch {
        if (!cancelled) setError("Не удалось загрузить список сессий");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900 p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Мои сессии</h1>
        <Link
          to="/dashboard"
          className="text-sm text-indigo-600 hover:text-indigo-700 underline-offset-2 hover:underline"
        >
          Назад в главное меню
        </Link>
      </header>

      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => navigate("/sessions/create")}
          className="flex items-center justify-center w-10 h-10 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 shadow-sm"
          title="Создать сессию"
        >
          +
        </button>
      </div>

      <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm min-h-[200px]">
        {loading && <p className="text-gray-600 text-sm">Загрузка…</p>}
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {!loading && !error && sessions.length === 0 && (
          <p className="text-gray-600 text-sm">Список созданных сессий пуст.</p>
        )}
        {!loading && !error && sessions.length > 0 && (
          <ul className="space-y-3">
            {sessions.map((s) => (
              <li key={s.id} className="border-b border-gray-200 pb-3 last:border-0 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-gray-900">{s.name}</div>
                  {s.description && (
                    <div className="text-sm text-gray-600 mt-1">{s.description}</div>
                  )}
                  <div className="text-xs text-gray-500 mt-1">
                    {s.isPrivate ? "Приватная" : "Публичная"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/sessions/${s.id}`)}
                  className="shrink-0 px-3 py-1.5 rounded bg-indigo-600 text-white text-sm hover:bg-indigo-500"
                >
                  Войти
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
