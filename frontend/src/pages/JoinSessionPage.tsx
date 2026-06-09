import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { discoverSessions } from "../api/sessions";
import { joinSession } from "../api/access";
import type { DiscoverSessionDto } from "@dnd-table/shared";

export default function JoinSessionPage() {
  const navigate = useNavigate();
  const [mine, setMine] = useState<DiscoverSessionDto[]>([]);
  const [others, setOthers] = useState<DiscoverSessionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [onlyPublic, setOnlyPublic] = useState(false);
  const [unvisited, setUnvisited] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await discoverSessions({
        q: searchQ.trim() || undefined,
        onlyPublic,
        unvisited,
      });
      setMine(res.data.mine);
      setOthers(res.data.others);
    } catch {
      setError("Не удалось загрузить список сессий");
    } finally {
      setLoading(false);
    }
  }, [searchQ, onlyPublic, unvisited]);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), searchQ ? 300 : 0);
    return () => window.clearTimeout(t);
  }, [load, searchQ]);

  const join = async (sessionId: string) => {
    try {
      await joinSession(sessionId);
      navigate(`/sessions/${sessionId}`);
    } catch {
      setError("Не удалось войти в сессию");
    }
  };

  const renderList = (sessions: DiscoverSessionDto[]) => (
    <ul className="space-y-3">
      {sessions.map((s) => (
        <li
          key={s.id}
          className="border-b border-gray-200 pb-3 last:border-0 flex items-start justify-between gap-4"
        >
          <div className="min-w-0 flex-1">
            <div className="font-medium text-gray-900">
              {s.name}
              {s.isPrivate && (
                <span className="ml-2 text-xs text-amber-700">приватная</span>
              )}
            </div>
            {s.description && (
              <div className="text-sm text-gray-600 mt-1">{s.description}</div>
            )}
            {s.createdBy && (
              <div className="text-xs text-gray-500 mt-1">Создатель: {s.createdBy}</div>
            )}
          </div>
          <button
            type="button"
            onClick={() => void join(s.id)}
            className="shrink-0 px-3 py-1.5 rounded bg-indigo-600 text-white text-sm hover:bg-indigo-500"
          >
            Войти
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center">
        <input
          className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
          placeholder="Поиск по названию или описанию"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={onlyPublic}
            onChange={(e) => setOnlyPublic(e.target.checked)}
          />
          Только публичные
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={unvisited}
            onChange={(e) => setUnvisited(e.target.checked)}
          />
          Непосещённые
        </label>
      </div>

      <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
        {loading && <p className="text-gray-600 text-sm">Загрузка…</p>}
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {!loading && !error && mine.length === 0 && others.length === 0 && (
          <p className="text-gray-600">Нет доступных сессий.</p>
        )}

        {!loading && mine.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Мои сессии</h2>
            {renderList(mine)}
          </section>
        )}

        {!loading && mine.length > 0 && others.length > 0 && (
          <hr className="border-gray-300 my-4" />
        )}

        {!loading && others.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Другие сессии</h2>
            {renderList(others)}
          </section>
        )}
      </div>
    </div>
  );
}
