import { useCallback, useEffect, useState } from "react";
import type { AdminSessionDto, AdminUserDto } from "@dnd-table/shared";
import { Link } from "react-router-dom";
import {
  deleteAdminSession,
  deleteAdminUser,
  getAdminSessions,
  getAdminUsers,
  setAdminSessionBlocked,
  setAdminUserBanned,
} from "../api/admin";
import { PageLayout } from "../components/layout/PageLayout";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  SegmentedControl,
  Spinner,
} from "../components/ui";

type Tab = "sessions" | "users";

const TAB_OPTIONS = [
  { value: "sessions" as const, label: "Сессии" },
  { value: "users" as const, label: "Пользователи" },
];

export default function AdminPanelPage() {
  const [tab, setTab] = useState<Tab>("sessions");
  const [searchQ, setSearchQ] = useState("");
  const [sessions, setSessions] = useState<AdminSessionDto[]>([]);
  const [users, setUsers] = useState<AdminUserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<
    { kind: "session"; item: AdminSessionDto } | { kind: "user"; item: AdminUserDto } | null
  >(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === "sessions") {
        const res = await getAdminSessions(searchQ.trim() || undefined);
        setSessions(res.data.sessions);
      } else {
        const res = await getAdminUsers(searchQ.trim() || undefined);
        setUsers(res.data.users);
      }
    } catch {
      setError("Не удалось загрузить данные");
    } finally {
      setLoading(false);
    }
  }, [tab, searchQ]);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), searchQ ? 300 : 0);
    return () => window.clearTimeout(t);
  }, [load, searchQ]);

  const toggleSessionBlock = async (s: AdminSessionDto) => {
    setBusyId(s.id);
    setError(null);
    try {
      await setAdminSessionBlocked(s.id, !s.isBlocked);
      await load();
    } catch {
      setError("Не удалось изменить статус сессии");
    } finally {
      setBusyId(null);
    }
  };

  const toggleUserBan = async (u: AdminUserDto) => {
    if (u.isAdmin) return;
    setBusyId(u.id);
    setError(null);
    try {
      await setAdminUserBanned(u.id, !u.isBanned);
      await load();
    } catch {
      setError("Не удалось изменить статус пользователя");
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.item.id);
    setError(null);
    try {
      if (deleteTarget.kind === "session") {
        await deleteAdminSession(deleteTarget.item.id);
      } else {
        await deleteAdminUser(deleteTarget.item.id);
      }
      setDeleteTarget(null);
      await load();
    } catch {
      setError("Не удалось удалить");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="ui-zoom min-h-screen bg-background text-text">
      <PageLayout
        title="Админ-панель"
        description="Управление сессиями и пользователями"
        maxWidth="xl"
        actions={
          <Link
            to="/dashboard"
            className="text-sm font-medium text-primary hover:text-primary-hover"
          >
            ← Меню
          </Link>
        }
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SegmentedControl value={tab} options={TAB_OPTIONS} onChange={setTab} />
          <Input
            className="sm:max-w-xs"
            placeholder={tab === "sessions" ? "Поиск сессий…" : "Поиск пользователей…"}
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
          />
        </div>

        {error && <Alert variant="error" className="mb-4">{error}</Alert>}

        {loading && (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        )}

        {!loading && tab === "sessions" && sessions.length === 0 && (
          <Card>
            <EmptyState title="Сессии не найдены" />
          </Card>
        )}

        {!loading && tab === "users" && users.length === 0 && (
          <Card>
            <EmptyState title="Пользователи не найдены" />
          </Card>
        )}

        {!loading && tab === "sessions" && sessions.length > 0 && (
          <ul className="space-y-3">
            {sessions.map((s) => (
              <li key={s.id}>
                <Card className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-text">{s.name}</h2>
                      {s.isPrivate && <Badge variant="warning">Приватная</Badge>}
                      {s.isBlocked && <Badge variant="error">Заблокирована</Badge>}
                    </div>
                    {s.description && (
                      <p className="text-sm text-text-secondary mt-1">{s.description}</p>
                    )}
                    <p className="text-xs text-text-muted mt-1">
                      Создатель: {s.createdByUsername} ·{" "}
                      {new Date(s.createdAt).toLocaleString("ru-RU")}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busyId === s.id}
                      onClick={() => void toggleSessionBlock(s)}
                    >
                      {s.isBlocked ? "Разблокировать" : "Заблокировать"}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={busyId === s.id}
                      onClick={() => setDeleteTarget({ kind: "session", item: s })}
                    >
                      Удалить
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}

        {!loading && tab === "users" && users.length > 0 && (
          <ul className="space-y-3">
            {users.map((u) => (
              <li key={u.id}>
                <Card className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-text">{u.username}</h2>
                      {u.isAdmin && <Badge variant="primary">Админ</Badge>}
                      {u.isBanned && <Badge variant="error">Забанен</Badge>}
                    </div>
                    <p className="text-sm text-text-secondary mt-1">{u.email}</p>
                    <p className="text-xs text-text-muted mt-1">
                      Сессий: {u.sessionCount} ·{" "}
                      {new Date(u.createdAt).toLocaleString("ru-RU")}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {!u.isAdmin && (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={busyId === u.id}
                          onClick={() => void toggleUserBan(u)}
                        >
                          {u.isBanned ? "Разбанить" : "Забанить"}
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={busyId === u.id}
                          onClick={() => setDeleteTarget({ kind: "user", item: u })}
                        >
                          Удалить
                        </Button>
                      </>
                    )}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </PageLayout>

      <Modal
        open={deleteTarget != null}
        onClose={() => setDeleteTarget(null)}
        title="Подтвердите удаление"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Отмена
            </Button>
            <Button variant="danger" loading={busyId != null} onClick={() => void confirmDelete()}>
              Удалить
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-secondary">
          {deleteTarget?.kind === "session"
            ? `Удалить сессию «${deleteTarget.item.name}»? Действие необратимо.`
            : `Удалить пользователя «${deleteTarget?.item.username}»? Действие необратимо.`}
        </p>
      </Modal>
    </div>
  );
}
