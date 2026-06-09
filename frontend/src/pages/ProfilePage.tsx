import { useEffect, useState } from "react";
import { useSession } from "../state/session";
import { getUserMe } from "../api/users";
import { searchUsers } from "../api/users";
import {
  getFriends,
  removeFriend,
  sendFriendRequest,
  sendFriendRequestByCode,
} from "../api/friends";
import type { FriendDto, UserSearchResult } from "@dnd-table/shared";
import { Avatar } from "../components/Avatar";

type Tab = "profile" | "search" | "friends";

export default function ProfilePage() {
  const { user, refreshSession } = useSession();
  const [tab, setTab] = useState<Tab>("profile");
  const [friendCode, setFriendCode] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [friends, setFriends] = useState<FriendDto[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getUserMe()
      .then((r) => {
        if (r?.data?.user?.friendCode) setFriendCode(r.data.user.friendCode);
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (tab === "friends") {
      void getFriends()
        .then((r) => setFriends(r.data.friends))
        .catch(() => setFriends([]));
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

  const addByCode = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await sendFriendRequestByCode(codeInput.trim());
      setMessage("Заявка отправлена");
      setCodeInput("");
    } catch {
      setMessage("Не удалось отправить заявку");
    } finally {
      setBusy(false);
    }
  };

  const addFriend = async (userId: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await sendFriendRequest(userId);
      setMessage("Заявка отправлена");
    } catch {
      setMessage("Не удалось отправить заявку");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (userId: string) => {
    if (!window.confirm("Удалить из друзей?")) return;
    setBusy(true);
    try {
      await removeFriend(userId);
      setFriends((prev) => prev.filter((f) => f.userId !== userId));
    } catch {
      setMessage("Не удалось удалить друга");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex gap-2 border-b border-gray-200 mb-4 text-sm">
        {(["profile", "search", "friends"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            className={`px-3 py-2 capitalize ${
              tab === t ? "border-b-2 border-indigo-600 text-indigo-700" : "text-gray-600"
            }`}
            onClick={() => setTab(t)}
          >
            {t === "profile" ? "Профиль" : t === "search" ? "Поиск" : "Друзья"}
          </button>
        ))}
      </div>

      {message && <p className="text-sm text-green-700 mb-3">{message}</p>}

      {tab === "profile" && (
        <div className="border border-gray-200 rounded-lg p-4 space-y-4">
          {user ? (
            <>
              <div>
                <div className="text-sm text-gray-500">Никнейм</div>
                <div className="text-lg font-medium">{user.username}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Почта</div>
                <div>{user.email}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Код дружбы</div>
                <div className="font-mono text-xl tracking-widest">{friendCode || "—"}</div>
              </div>
              <div className="border-t pt-4">
                <div className="text-sm text-gray-500 mb-2">Добавить по коду</div>
                <div className="flex gap-2">
                  <input
                    className="border border-gray-300 rounded px-2 py-1 font-mono flex-1"
                    placeholder="000000"
                    maxLength={6}
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  />
                  <button
                    type="button"
                    disabled={busy || codeInput.length !== 6}
                    className="px-3 py-1 bg-indigo-600 text-white rounded text-sm disabled:opacity-50"
                    onClick={() => void addByCode()}
                  >
                    Добавить
                  </button>
                </div>
              </div>
              <button
                type="button"
                className="text-sm text-indigo-600"
                onClick={() => void refreshSession()}
              >
                Обновить данные
              </button>
            </>
          ) : (
            <p className="text-gray-600">Войдите в аккаунт</p>
          )}
        </div>
      )}

      {tab === "search" && (
        <div className="space-y-3">
          <input
            className="w-full border border-gray-300 rounded px-3 py-2"
            placeholder="Поиск по нику"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
          />
          <ul className="space-y-2">
            {searchResults.map((u) => (
              <li
                key={u.id}
                className="flex items-center justify-between border border-gray-200 rounded p-2"
              >
                <div className="flex items-center gap-2">
                  <Avatar filename={u.avatar} />
                  <span>{u.username}</span>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  className="text-sm px-2 py-1 bg-indigo-600 text-white rounded disabled:opacity-50"
                  onClick={() => void addFriend(u.id)}
                >
                  Добавить в друзья
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "friends" && (
        <ul className="space-y-2">
          {friends.length === 0 && <p className="text-gray-500">Пока нет друзей</p>}
          {friends.map((f) => (
            <li
              key={f.userId}
              className="flex items-center justify-between border border-gray-200 rounded p-2"
            >
              <div className="flex items-center gap-2">
                <Avatar filename={f.avatar} />
                <span>{f.username}</span>
              </div>
              <button
                type="button"
                disabled={busy}
                className="text-sm text-red-600 hover:underline disabled:opacity-50"
                onClick={() => void remove(f.userId)}
              >
                Удалить
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
