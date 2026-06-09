import { useEffect, useRef, useState } from "react";
import type { InboxMessageDto } from "@dnd-table/shared";
import { useInbox } from "../hooks/useInbox";
import { Button, EmptyState, Spinner } from "./ui";

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
    msg.status !== "acted";

  return (
    <li className="border-b border-border px-3 py-2 text-sm last:border-0">
      <p className="text-text">{msg.text}</p>
      <p className="text-[10px] text-text-muted mt-0.5">
        {new Date(msg.createdAt).toLocaleString("ru-RU")}
      </p>
      {actionable && (
        <div className="flex gap-2 mt-2">
          <Button
            size="sm"
            disabled={busy}
            className="!px-2 !py-0.5 text-xs"
            onClick={() => onAct(msg.id, "accept")}
          >
            Принять
          </Button>
          <Button
            variant="danger"
            size="sm"
            disabled={busy}
            className="!px-2 !py-0.5 text-xs"
            onClick={() => onAct(msg.id, "decline")}
          >
            Отклонить
          </Button>
        </div>
      )}
    </li>
  );
}

export function MailboxPanel() {
  const { messages, unreadCount, loading, act, markAllRead } = useInbox();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && unreadCount > 0) {
      void markAllRead();
    }
  }, [open, unreadCount, markAllRead]);

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
        className="relative px-2 py-1 text-sm text-primary hover:text-primary-hover transition-colors duration-150"
        onClick={() => setOpen((v) => !v)}
        aria-label="Почта"
        aria-expanded={open}
      >
        ✉
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-error text-white text-[10px] leading-4 text-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 max-h-96 bg-surface border border-border rounded-xl shadow-elevated z-50 flex flex-col dropdown-panel">
          <div className="px-3 py-2 border-b border-border font-medium text-sm text-text">
            Почта
          </div>
          {loading ? (
            <div className="flex justify-center p-6">
              <Spinner />
            </div>
          ) : messages.length === 0 ? (
            <div className="p-4">
              <EmptyState title="Нет сообщений" />
            </div>
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
