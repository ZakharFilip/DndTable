import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { deleteSession, getMySessions } from "../api/sessions";
import type { GameSessionDto } from "../api/sessions";
import { PageLayout } from "../components/layout/PageLayout";
import { useSession } from "../state/session";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Modal,
  Spinner,
} from "../components/ui";

export default function SessionsListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSession();
  const [sessions, setSessions] = useState<GameSessionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GameSessionDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMySessions();
      setSessions(res.data.sessions);
    } catch {
      setError("Не удалось загрузить список сессий");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteSession(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch {
      setError("Не удалось удалить сессию");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <PageLayout
      title="Мои сессии"
      description="Созданные вами игровые столы"
      actions={
        <Button onClick={() => navigate("/sessions/create")}>Создать сессию</Button>
      }
    >
      {loading && (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      )}
      {error && <Alert variant="error">{error}</Alert>}
      {!loading && !error && sessions.length === 0 && (
        <Card>
          <EmptyState
            title="Список сессий пуст"
            description="Создайте первую сессию, чтобы начать игру за столом."
            action={
              <Button onClick={() => navigate("/sessions/create")}>Создать сессию</Button>
            }
          />
        </Card>
      )}
      {!loading && !error && sessions.length > 0 && (
        <ul className="space-y-3">
          {sessions.map((s) => {
            const isOwner = user?.id === s.createdBy;
            return (
              <li key={s.id}>
                <Card className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-medium text-text">{s.name}</h2>
                      <Badge variant={s.isPrivate ? "warning" : "primary"}>
                        {s.isPrivate ? "Приватная" : "Публичная"}
                      </Badge>
                    </div>
                    {s.description && (
                      <p className="text-sm text-text-secondary mt-1">{s.description}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {isOwner && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setDeleteTarget(s)}
                      >
                        Удалить
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() =>
                        navigate(`/sessions/${s.id}`, {
                          state: { returnTo: location.pathname },
                        })
                      }
                    >
                      Войти
                    </Button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={deleteTarget !== null}
        onClose={() => !deleting && setDeleteTarget(null)}
        title="Удалить сессию?"
        footer={
          <>
            <Button variant="secondary" disabled={deleting} onClick={() => setDeleteTarget(null)}>
              Отмена
            </Button>
            <Button variant="danger" loading={deleting} onClick={() => void confirmDelete()}>
              Удалить
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-secondary">
          {deleteTarget
            ? `Удалить сессию «${deleteTarget.name}»? Это действие необратимо.`
            : ""}
        </p>
      </Modal>
    </PageLayout>
  );
}
