import type { Socket } from "socket.io-client";
import type { AppliedOp, TablePatchOp } from "@dnd-table/shared";

export type { AppliedOp, TablePatchOp } from "@dnd-table/shared";

export type SyncStatus = "idle" | "syncing" | "ok" | "error" | "conflict";

type PatchAck = {
  success?: boolean;
  status?: number;
  error?: string;
  message?: string;
  applied?: AppliedOp[];
  conflicts?: Array<{
    opId: string;
    key: string;
    expectedVersion: number;
    actualVersion: number | null;
  }>;
};

function mergeUpdateIntoCreate(create: TablePatchOp, update: TablePatchOp) {
  if (create.action !== "create" || update.action !== "update") return;
  const patch = update.patch;
  if (patch.x !== undefined) create.object.x = patch.x;
  if (patch.y !== undefined) create.object.y = patch.y;
  if (patch.sortOrder !== undefined) create.object.sortOrder = patch.sortOrder;
  if (patch.props !== undefined) create.object.props = patch.props;
}

function sortOpsForSend(ops: TablePatchOp[]): TablePatchOp[] {
  const rank = (op: TablePatchOp) => (op.action === "create" ? 0 : op.action === "update" ? 1 : 2);
  return [...ops].sort((a, b) => rank(a) - rank(b));
}

export class TableSync {
  private pending: TablePatchOp[] = [];
  private debounceTimer: number | null = null;
  private throttleTimer: number | null = null;
  private lastSendAt = 0;
  private inFlight = false;
  /** Create ops already sent, waiting for ack. */
  private inFlightCreates = new Set<string>();
  /** Updates for objects whose create is still in flight. */
  private deferredUpdates = new Map<string, TablePatchOp>();

  private params: {
    tableId: string;
    clientId: string;
    socket: Socket;
    setStatus: (s: SyncStatus) => void;
    onConflict: () => Promise<void>;
    onBroadcast: (applied: AppliedOp[]) => void;
  };

  constructor(params: {
    tableId: string;
    clientId: string;
    socket: Socket;
    setStatus: (s: SyncStatus) => void;
    onConflict: () => Promise<void>;
    onBroadcast: (applied: AppliedOp[]) => void;
  }) {
    this.params = params;
  }

  start() {
    this.params.socket.emit("joinTable", { tableId: this.params.tableId });
    const handler = (payload: { tableId: string; clientId: string; applied: AppliedOp[] }) => {
      if (!payload || payload.tableId !== this.params.tableId || !Array.isArray(payload.applied)) return;
      if (payload.clientId === this.params.clientId) return;
      this.params.onBroadcast(payload.applied);
    };
    this.params.socket.on("table:patchApplied", handler);
    return () => {
      this.params.socket.off("table:patchApplied", handler);
    };
  }

  enqueue(ops: TablePatchOp[]) {
    for (const op of ops) {
      this.enqueueOne(op);
    }
    this.scheduleFlush();
  }

  private enqueueOne(op: TablePatchOp) {
    if (op.action === "update") {
      const pendingCreateIdx = this.pending.findIndex(
        (p) => p.action === "create" && p.key === op.key
      );
      if (pendingCreateIdx >= 0) {
        mergeUpdateIntoCreate(this.pending[pendingCreateIdx], op);
        return;
      }
      if (this.inFlightCreates.has(op.key)) {
        const prev = this.deferredUpdates.get(op.key);
        if (prev && prev.action === "update") {
          const merged: TablePatchOp = {
            ...prev,
            patch: { ...prev.patch, ...op.patch },
          };
          this.deferredUpdates.set(op.key, merged);
        } else {
          this.deferredUpdates.set(op.key, op);
        }
        return;
      }
    }
    this.pending.push(op);
  }

  flushNow() {
    void this.flush();
  }

  drainPayload() {
    return this.pending.splice(0, this.pending.length);
  }

  private scheduleFlush() {
    if (this.debounceTimer) window.clearTimeout(this.debounceTimer);
    this.debounceTimer = window.setTimeout(() => {
      this.debounceTimer = null;
      void this.flush();
    }, 300);
  }

  private releaseDeferredCreates(applied: AppliedOp[]) {
    for (const op of applied) {
      if (op.action !== "create") continue;
      this.inFlightCreates.delete(op.key);
      const deferred = this.deferredUpdates.get(op.key);
      if (!deferred) continue;
      this.deferredUpdates.delete(op.key);
      if (deferred.action === "update") {
        this.pending.push({ ...deferred, baseVersion: op.version });
      }
    }
  }

  private finishFlight(applied?: AppliedOp[]) {
    this.inFlight = false;
    if (applied?.length) this.releaseDeferredCreates(applied);
    if (this.pending.length > 0) void this.flush();
  }

  private async flush() {
    if (this.pending.length === 0 || this.inFlight) return;

    const now = Date.now();
    const minInterval = 100;
    const delta = now - this.lastSendAt;
    if (delta < minInterval) {
      if (this.throttleTimer) return;
      this.throttleTimer = window.setTimeout(() => {
        this.throttleTimer = null;
        void this.flush();
      }, minInterval - delta);
      return;
    }

    const batch = sortOpsForSend(this.pending);
    this.pending = [];
    this.lastSendAt = now;
    this.inFlight = true;
    for (const op of batch) {
      if (op.action === "create") this.inFlightCreates.add(op.key);
    }
    this.params.setStatus("syncing");

    this.params.socket.emit(
      "table:patch",
      { tableId: this.params.tableId, clientId: this.params.clientId, ops: batch },
      async (ack: PatchAck) => {
        if (ack?.success) {
          if (ack.applied?.length) {
            this.params.onBroadcast(ack.applied);
          }
          this.params.setStatus("ok");
          window.setTimeout(() => this.params.setStatus("idle"), 800);
          this.finishFlight(ack.applied);
          return;
        }
        if (ack?.status === 403 || ack?.error === "FORBIDDEN") {
          this.params.setStatus("error");
          window.setTimeout(() => this.params.setStatus("idle"), 2000);
          for (const op of batch) {
            if (op.action === "create") this.inFlightCreates.delete(op.key);
          }
          this.pending = batch.concat(this.pending);
          this.finishFlight();
          return;
        }
        if (ack?.status === 409 || ack?.error === "VERSION_CONFLICT") {
          if (ack.conflicts?.length) {
            console.warn("[TableSync] VERSION_CONFLICT", ack.conflicts);
          }
          this.params.setStatus("conflict");
          for (const op of batch) {
            if (op.action === "create") this.inFlightCreates.delete(op.key);
          }
          for (const op of batch) {
            if (op.action === "create") this.deferredUpdates.delete(op.key);
          }
          try {
            await this.params.onConflict();
            window.setTimeout(() => this.params.setStatus("idle"), 1200);
          } catch {
            this.params.setStatus("error");
          }
          this.finishFlight();
          return;
        }
        for (const op of batch) {
          if (op.action === "create") this.inFlightCreates.delete(op.key);
        }
        this.pending = batch.concat(this.pending);
        this.params.setStatus("error");
        window.setTimeout(() => this.params.setStatus("idle"), 1500);
        this.finishFlight();
      }
    );
  }
}
