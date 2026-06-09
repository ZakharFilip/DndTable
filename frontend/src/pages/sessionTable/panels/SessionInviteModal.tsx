import { useEffect, useState } from "react";
import type { FriendDto, UserSearchResult } from "@dnd-table/shared";
import { getFriends } from "../../../api/friends";
import { searchUsers } from "../../../api/users";
import { sendSessionInvite } from "../../../api/sessionInvites";
import { Avatar } from "../../../components/Avatar";
import {
  Alert,
  Button,
  EmptyState,
  Input,
  Modal,
  SegmentedControl,
  Spinner,
} from "../../../components/ui";

type Tab = "friends" | "search";

interface SessionInviteModalProps {
  sessionId: string;
  onClose: () => void;
}

const TAB_OPTIONS = [
  { value: "friends" as const, label: "Друзья" },
  { value: "search" as const, label: "Поиск" },
];

export function SessionInviteModal({ sessionId, onClose }: SessionInviteModalProps) {
  const [tab, setTab] = useState<Tab>("friends");
  const [friends, setFriends] = useState<FriendDto[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageVariant, setMessageVariant] = useState<"success" | "error">("success");

  useEffect(() => {
    void getFriends()
      .then((r) => setFriends(r.data.friends))
      .catch(() => setFriends([]))
      .finally(() => setFriendsLoading(false));
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
      setMessageVariant("success");
    } catch {
      setMessage("Не удалось отправить приглашение");
      setMessageVariant("error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={true} title="Пригласить игрока" onClose={onClose} className="max-w-md max-h-[80vh] flex flex-col">
      <div className="flex flex-col gap-4 -mt-2">
        <SegmentedControl value={tab} options={TAB_OPTIONS} onChange={setTab} className="w-full" />

        {message && <Alert variant={messageVariant}>{message}</Alert>}

        {tab === "friends" && (
          <>
            {friendsLoading && (
              <div className="flex justify-center py-6">
                <Spinner />
              </div>
            )}
            {!friendsLoading && friends.length === 0 && (
              <EmptyState title="Список друзей пуст" />
            )}
            <ul className="space-y-2 max-h-64 overflow-auto">
              {friends.map((f) => (
                <li
                  key={f.userId}
                  className="flex items-center justify-between gap-2 border border-border rounded-lg px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar filename={f.avatar} size={28} />
                    <span className="text-sm truncate text-text">{f.username}</span>
                  </div>
                  <Button size="sm" disabled={busy} onClick={() => void invite(f.userId)}>
                    Пригласить
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}

        {tab === "search" && (
          <>
            <Input
              placeholder="Никнейм (мин. 2 символа)"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
            />
            {searchQ.trim().length >= 2 && searchResults.length === 0 && (
              <EmptyState title="Никого не найдено" />
            )}
            <ul className="space-y-2 max-h-64 overflow-auto">
              {searchResults.map((u) => (
                <li
                  key={u.id}
                  className="flex items-center justify-between gap-2 border border-border rounded-lg px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar filename={u.avatar} size={28} />
                    <span className="text-sm truncate text-text">{u.username}</span>
                  </div>
                  <Button size="sm" disabled={busy} onClick={() => void invite(u.id)}>
                    Пригласить
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Modal>
  );
}
