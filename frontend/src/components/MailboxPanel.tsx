import { useRef, useState } from "react";
import type { InboxMessageDto } from "@dnd-table/shared";
import { useInbox } from "../hooks/useInbox";

function MessageRow({
  msg,
  onAct,
  busy,
}: {
  msg: InboxMessageDto;
  onAct: (id: string, action: "accept" | "decline") => void;
  busy: boolean;
}) {
  const actionable =
    msg.actionable &&
    (msg.type === "friend_request" || msg.type === "session_invite") &&
    msg.status === "pending";

  return (
    <li className="border-b border-gray-100 px-3 py-2 text-sm">
      <p className="text-gray-900">{msg.text}</p>
      <p className="text-[10px] text-gray-400 mt-0.5">
        {new Date(msg.createdAt).toLocaleString("ru-RU")}
      </p>
      {actionable && (
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            disabled={busy}
            className="px-2 py-0.5 rounded bg-green-600 text-white text-xs disabled:opacity-50"
            onClick={() => onAct(msg.id, "accept")}
          >
            ✓
          </button>
          <button
            type="button"
            disabled={busy}
            className="px-2 py-0.5 rounded bg-red-600 text-white text-xs disabled:opacity-50"
            onClick={() => onAct(msg.id, "decline")}
          >
            ✗
          </button>
        </div>
      )}
    </li>
  );
}

export function MailboxPanel() {
  const { messages, unreadCount, loading, act } = useInbox();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleAct = async (id: string, action: "accept" | "decline") => {
    setBusy(true);
    try {
      await act(id, action);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        className="relative px-2 py-1 text-sm text-indigo-600 hover:text-indigo-800"
        onClick={() => setOpen((v) => !v)}
        aria-label="Почта"
      >
        ✉
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] leading-4 text-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 max-h-96 bg-white border border-gray-200 rounded-lg shadow-lg z-50 flex flex-col">
          <div className="px-3 py-2 border-b border-gray-200 font-medium text-sm">Почта</div>
          {loading ? (
            <p className="p-3 text-sm text-gray-500">Загрузка…</p>
          ) : messages.length === 0 ? (
            <p className="p-3 text-sm text-gray-500">Нет сообщений</p>
          ) : (
            <ul className="overflow-auto flex-1">
              {messages.map((m) => (
                <MessageRow key={m.id} msg={m} onAct={handleAct} busy={busy} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
