import { useEffect, useState } from "react";
import type { FriendDto, UserSearchResult } from "@dnd-table/shared";
import { getFriends } from "../../../api/friends";
import { searchUsers } from "../../../api/users";
import { sendSessionInvite } from "../../../api/sessionInvites";
import { Avatar } from "../../../components/Avatar";

type Tab = "friends" | "search";

interface SessionInviteModalProps {
  sessionId: string;
  onClose: () => void;
}

export function SessionInviteModal({ sessionId, onClose }: SessionInviteModalProps) {
  const [tab, setTab] = useState<Tab>("friends");
  const [friends, setFriends] = useState<FriendDto[]>([]);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void getFriends()
      .then((r) => setFriends(r.data.friends))
      .catch(() => setFriends([]));
  }, []);

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

  const invite = async (userId: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await sendSessionInvite(sessionId, userId);
      setMessage("Приглашение отправлено");
    } catch {
      setMessage("Не удалось отправить приглашение");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        <header className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold">Пригласить игрока</h3>
          <button type="button" className="text-sm text-gray-600" onClick={onClose}>
            Закрыть
          </button>
        </header>

        <div className="flex border-b text-sm">
          <button
            type="button"
            className={`flex-1 py-2 ${tab === "friends" ? "border-b-2 border-indigo-600 text-indigo-700" : ""}`}
            onClick={() => setTab("friends")}
          >
            Друзья
          </button>
          <button
            type="button"
            className={`flex-1 py-2 ${tab === "search" ? "border-b-2 border-indigo-600 text-indigo-700" : ""}`}
            onClick={() => setTab("search")}
          >
            Поиск
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {message && <p className="text-sm text-green-700 mb-2">{message}</p>}

          {tab === "friends" && (
            <ul className="space-y-2">
              {friends.length === 0 && (
                <p className="text-sm text-gray-500">Список друзей пуст</p>
              )}
              {friends.map((f) => (
                <li key={f.userId} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar filename={f.avatar} size={28} />
                    <span className="text-sm truncate">{f.username}</span>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    className="text-xs px-2 py-1 bg-indigo-600 text-white rounded disabled:opacity-50"
                    onClick={() => void invite(f.userId)}
                  >
                    Пригласить
                  </button>
                </li>
              ))}
            </ul>
          )}

          {tab === "search" && (
            <>
              <input
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mb-3"
                placeholder="Никнейм (мин. 2 символа)"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
              />
              <ul className="space-y-2">
                {searchResults.map((u) => (
                  <li key={u.id} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar filename={u.avatar} size={28} />
                      <span className="text-sm truncate">{u.username}</span>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      className="text-xs px-2 py-1 bg-indigo-600 text-white rounded disabled:opacity-50"
                      onClick={() => void invite(u.id)}
                    >
                      Пригласить
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
