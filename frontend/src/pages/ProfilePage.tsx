import { useEffect, useRef, useState } from "react";
import { useSession } from "../state/session";
import { getUserMe, searchUsers, uploadAvatar } from "../api/users";
import {
  getFriends,
  removeFriend,
  sendFriendRequest,
  sendFriendRequestByCode,
} from "../api/friends";
import type { FriendDto, UserSearchResult } from "@dnd-table/shared";
import { Avatar } from "../components/Avatar";
import { PageLayout } from "../components/layout/PageLayout";
import {
  Alert,
  Button,
  Card,
  EmptyState,
  Input,
  Label,
  SegmentedControl,
  Spinner,
} from "../components/ui";

type Tab = "profile" | "search" | "friends";

const TAB_OPTIONS = [
  { value: "profile" as const, label: "Профиль" },
  { value: "search" as const, label: "Поиск" },
  { value: "friends" as const, label: "Друзья" },
];

function ListItem({
  avatar,
  name,
  action,
}: {
  avatar?: string;
  name: string;
  action: React.ReactNode;
}) {
  return (
    <Card padding="sm" className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar filename={avatar} />
        <span className="text-sm font-medium text-text truncate">{name}</span>
      </div>
      {action}
    </Card>
  );
}

export default function ProfilePage() {
  const { user, refreshSession } = useSession();
  const [tab, setTab] = useState<Tab>("profile");
  const [friendCode, setFriendCode] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [friends, setFriends] = useState<FriendDto[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [messageVariant, setMessageVariant] = useState<"success" | "error">("success");
  const [busy, setBusy] = useState(false);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void getUserMe()
      .then((r) => {
        if (r?.data?.user?.friendCode) setFriendCode(r.data.user.friendCode);
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (tab === "friends") {
      setFriendsLoading(true);
      void getFriends()
        .then((r) => setFriends(r.data.friends))
        .catch(() => setFriends([]))
        .finally(() => setFriendsLoading(false));
    }
  }, [tab]);

  useEffect(() => {
    if (tab !== "search" || searchQ.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const t = window.setTimeout(() => {
      void searchUsers(searchQ.trim())
        .then((r) => setSearchResults(r.data.users))
        .catch(() => setSearchResults([]));
    }, 300);
    return () => window.clearTimeout(t);
  }, [tab, searchQ]);

  const showMessage = (text: string, variant: "success" | "error" = "success") => {
    setMessage(text);
    setMessageVariant(variant);
  };

  const addByCode = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await sendFriendRequestByCode(codeInput.trim());
      showMessage("Заявка отправлена");
      setCodeInput("");
    } catch {
      showMessage("Не удалось отправить заявку", "error");
    } finally {
      setBusy(false);
    }
  };

  const addFriend = async (userId: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await sendFriendRequest(userId);
      showMessage("Заявка отправлена");
    } catch {
      showMessage("Не удалось отправить заявку", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    setMessage(null);
    try {
      await uploadAvatar(file);
      await refreshSession();
      showMessage("Аватар обновлён");
    } catch {
      showMessage("Не удалось загрузить аватар", "error");
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  const remove = async (userId: string) => {
    if (!window.confirm("Удалить из друзей?")) return;
    setBusy(true);
    try {
      await removeFriend(userId);
      setFriends((prev) => prev.filter((f) => f.userId !== userId));
    } catch {
      showMessage("Не удалось удалить друга", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageLayout title="Профиль" description="Аккаунт, друзья и поиск игроков" maxWidth="md">
      <div className="mb-4">
        <SegmentedControl value={tab} options={TAB_OPTIONS} onChange={setTab} />
      </div>

      {message && (
        <Alert variant={messageVariant} className="mb-4">
          {message}
        </Alert>
      )}

      {tab === "profile" && (
        <Card className="space-y-4">
          {user ? (
            <>
              <div className="flex items-center gap-4">
                <Avatar filename={user.avatar} size={64} />
                <div className="space-y-2">
                  <div>
                    <div className="text-lg font-semibold text-text">{user.username}</div>
                    <div className="text-sm text-text-secondary">{user.email}</div>
                  </div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => void handleAvatarChange(e)}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={avatarUploading}
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    Изменить аватар
                  </Button>
                </div>
              </div>
              <div>
                <Label>Код дружбы</Label>
                <div className="mt-1 font-mono text-2xl tracking-widest text-text bg-background border border-border rounded-lg px-4 py-3">
                  {friendCode || "—"}
                </div>
              </div>
              <div className="border-t border-border pt-4">
                <Label htmlFor="friend-code">Добавить по коду</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="friend-code"
                    className="font-mono"
                    placeholder="000000"
                    maxLength={6}
                    value={codeInput}
                    onChange={(e) =>
                      setCodeInput(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                  />
                  <Button
                    disabled={busy || codeInput.length !== 6}
                    loading={busy}
                    onClick={() => void addByCode()}
                  >
                    Добавить
                  </Button>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => void refreshSession()}>
                Обновить данные
              </Button>
            </>
          ) : (
            <EmptyState title="Войдите в аккаунт" />
          )}
        </Card>
      )}

      {tab === "search" && (
        <div className="space-y-3">
          <Input
            placeholder="Поиск по нику (мин. 2 символа)"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
          />
          {searchQ.trim().length >= 2 && searchResults.length === 0 && (
            <Card>
              <EmptyState title="Никого не найдено" />
            </Card>
          )}
          <ul className="space-y-2">
            {searchResults.map((u) => (
              <li key={u.id}>
                <ListItem
                  avatar={u.avatar}
                  name={u.username}
                  action={
                    <Button size="sm" disabled={busy} onClick={() => void addFriend(u.id)}>
                      Добавить
                    </Button>
                  }
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "friends" && (
        <>
          {friendsLoading && (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          )}
          {!friendsLoading && friends.length === 0 && (
            <Card>
              <EmptyState title="Пока нет друзей" description="Найдите игроков через поиск или код дружбы." />
            </Card>
          )}
          <ul className="space-y-2">
            {friends.map((f) => (
              <li key={f.userId}>
                <ListItem
                  avatar={f.avatar}
                  name={f.username}
                  action={
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      className="text-error hover:text-error"
                      onClick={() => void remove(f.userId)}
                    >
                      Удалить
                    </Button>
                  }
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </PageLayout>
  );
}
