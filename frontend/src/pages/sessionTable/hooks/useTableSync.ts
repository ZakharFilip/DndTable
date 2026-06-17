import { useCallback, useEffect, useRef, useState } from "react";
import { getSocket } from "../../../realtime/socket";
import {
  TableSync,
  type AmendUnackedResult,
  type AppliedOp,
  type PatchConflict,
  type SyncStatus,
  type TablePatchOp,
  type UnackedObjectDto,
} from "../../../tabletop/realtime/TableSync";

export type { PatchConflict, UnackedObjectDto, AmendUnackedResult };

interface UseTableSyncParams {
  id: string | undefined;
  clientId: string;
  onConflict: (conflicts: PatchConflict[]) => Promise<void>;
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
      onConflict: (conflicts) => onConflictRef.current(conflicts),
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

  const amendUnackedUpdate = useCallback(
    (
      key: string,
      patch: {
        x?: number;
        y?: number;
        sortOrder?: number;
        props?: Record<string, unknown>;
      }
    ) => {
      return syncRef.current?.amendUnackedUpdate(key, patch) ?? ("no_target" as AmendUnackedResult);
    },
    []
  );

  const upsertUnackedCreate = useCallback((key: string, object: UnackedObjectDto) => {
    return syncRef.current?.upsertUnackedCreate(key, object) ?? ("pending" as const);
  }, []);

  const cancelUnackedCreate = useCallback((key: string) => {
    syncRef.current?.cancelUnackedCreate(key);
  }, []);

  const isCreatePendingOrInFlight = useCallback((key: string) => {
    return syncRef.current?.isCreatePendingOrInFlight(key) ?? false;
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

  return {
    syncStatus,
    enqueueOps,
    flushNow,
    amendUnackedUpdate,
    upsertUnackedCreate,
    cancelUnackedCreate,
    isCreatePendingOrInFlight,
  };
}
