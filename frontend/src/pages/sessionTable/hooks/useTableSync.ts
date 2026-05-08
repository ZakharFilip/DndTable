import { useCallback, useEffect, useRef, useState } from "react";
import { getSocket } from "../../../realtime/socket";
import {
  TableSync,
  type AppliedOp,
  type SyncStatus,
  type TablePatchOp,
} from "../../../tabletop/realtime/TableSync";

interface UseTableSyncParams {
  id: string | undefined;
  clientId: string;
  onConflict: () => Promise<void>;
  onBroadcast: (applied: AppliedOp[]) => void;
}

/**
 * Owns the TableSync lifecycle for the current table.
 * Exposes `enqueueOps` / `flushNow` and the current status, plus
 * best-effort flushes on focus loss / page hide.
 */
export function useTableSync({ id, clientId, onConflict, onBroadcast }: UseTableSyncParams) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const syncRef = useRef<TableSync | null>(null);
  const onConflictRef = useRef(onConflict);
  const onBroadcastRef = useRef(onBroadcast);

  useEffect(() => {
    onConflictRef.current = onConflict;
  }, [onConflict]);
  useEffect(() => {
    onBroadcastRef.current = onBroadcast;
  }, [onBroadcast]);

  useEffect(() => {
    if (!id) return;
    const socket = getSocket();
    syncRef.current = new TableSync({
      tableId: id,
      clientId,
      socket,
      setStatus: setSyncStatus,
      onConflict: () => onConflictRef.current(),
      onBroadcast: (applied) => onBroadcastRef.current(applied),
    });
    const stop = syncRef.current.start();
    return () => {
      stop();
      syncRef.current = null;
    };
  }, [id, clientId]);

  const enqueueOps = useCallback((ops: TablePatchOp[]) => {
    syncRef.current?.enqueue(ops);
  }, []);

  const flushNow = useCallback(() => {
    syncRef.current?.flushNow();
  }, []);

  // Best-effort flushes when the user switches focus or hides the page.
  useEffect(() => {
    if (!id) return;
    const onPageHide = () => syncRef.current?.flushNow();
    const onVis = () => {
      if (document.visibilityState === "hidden") syncRef.current?.flushNow();
    };
    const onFocusOut = (e: FocusEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const isTextField =
        t.tagName === "INPUT" ||
        t.tagName === "TEXTAREA" ||
        (t as HTMLElement).isContentEditable;
      if (isTextField) syncRef.current?.flushNow();
    };
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVis);
    document.addEventListener("focusout", onFocusOut, true);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVis);
      document.removeEventListener("focusout", onFocusOut, true);
    };
  }, [id]);

  return { syncStatus, enqueueOps, flushNow };
}
