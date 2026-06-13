import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { discoverSessions } from "../api/sessions";
import { joinSession } from "../api/access";
import type { DiscoverSessionDto } from "@dnd-table/shared";
import { PageLayout } from "../components/layout/PageLayout";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Spinner,
} from "../components/ui";

export default function JoinSessionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mine, setMine] = useState<DiscoverSessionDto[]>([]);
  const [others, setOthers] = useState<DiscoverSessionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [onlyPublic, setOnlyPublic] = useState(false);
  const [unvisited, setUnvisited] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);

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
    setJoining(sessionId);
    setError(null);
    try {
      await joinSession(sessionId);
      navigate(`/sessions/${sessionId}`, { state: { returnTo: location.pathname } });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string; message?: string } } };
      if (e.response?.data?.error === "SESSION_BLOCKED") {
        setError("Вход в эту сессию заблокирован");
      } else {
        setError("Не удалось войти в сессию");
      }
    } finally {
      setJoining(null);
    }
  };

  const renderList = (sessions: DiscoverSessionDto[]) => (
    <ul className="space-y-3">
      {sessions.map((s) => (
        <li key={s.id}>
          <Card className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-medium text-text">{s.name}</h3>
                {s.isPrivate && <Badge variant="warning">Приватная</Badge>}
              </div>
              {s.description && (
                <p className="text-sm text-text-secondary mt-1">{s.description}</p>
              )}
              {s.createdBy && (
                <p className="text-xs text-text-muted mt-1">Создатель: {s.createdBy}</p>
              )}
            </div>
            <Button
              size="sm"
              loading={joining === s.id}
              disabled={joining !== null}
              onClick={() => void join(s.id)}
            >
              Войти
            </Button>
          </Card>
        </li>
      ))}
    </ul>
  );

  const empty = !loading && !error && mine.length === 0 && others.length === 0;

  return (
    <PageLayout title="Присоединиться" description="Найдите сессию и войдите за стол">
      <Card className="mb-4 space-y-3">
        <Input
          placeholder="Поиск по названию или описанию"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
        />
        <div className="flex flex-wrap gap-4 text-sm text-text-secondary">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyPublic}
              onChange={(e) => setOnlyPublic(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary"
            />
            Только публичные
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={unvisited}
              onChange={(e) => setUnvisited(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary"
            />
            Непосещённые
          </label>
        </div>
      </Card>

      {loading && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}
      {error && <Alert variant="error">{error}</Alert>}
      {empty && (
        <Card>
          <EmptyState
            title="Нет доступных сессий"
            description="Попробуйте изменить фильтры или создайте свою сессию."
          />
        </Card>
      )}

      {!loading && mine.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-text-secondary mb-3">Мои сессии</h2>
          {renderList(mine)}
        </section>
      )}

      {!loading && mine.length > 0 && others.length > 0 && (
        <hr className="border-border my-4" />
      )}

      {!loading && others.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-text-secondary mb-3">Другие сессии</h2>
          {renderList(others)}
        </section>
      )}
    </PageLayout>
  );
}
