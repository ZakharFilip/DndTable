import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPublicSessions } from "../api/sessions";

interface PublicSession {
  id: string;
  name: string;
  description: string;
  isPrivate: boolean;
  createdBy?: string;
  createdAt: string;
}

export default function JoinSessionPage() {
  const [sessions, setSessions] = useState<PublicSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getPublicSessions();
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
    <div className="min-h-screen bg-gray-100 text-gray-900 p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Присоединиться к сессии</h1>
        <Link
          to="/dashboard"
          className="text-sm text-indigo-600 hover:text-indigo-700 underline-offset-2 hover:underline"
        >
          Назад в главное меню
        </Link>
      </header>

      <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
        {loading && <p className="text-gray-600 text-sm">Загрузка…</p>}
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {!loading && !error && sessions.length === 0 && (
          <p className="text-gray-600">Нет доступных публичных сессий.</p>
        )}
        {!loading && !error && sessions.length > 0 && (
          <ul className="space-y-3">
            {sessions.map((s) => (
              <li key={s.id} className="border-b border-gray-200 pb-3 last:border-0">
                <div className="font-medium text-gray-900">{s.name}</div>
                {s.description && (
                  <div className="text-sm text-gray-600 mt-1">{s.description}</div>
                )}
                {s.createdBy && (
                  <div className="text-xs text-gray-500 mt-1">Создатель: {s.createdBy}</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
