import type { Socket } from "socket.io-client";
import type { AppliedOp, TablePatchOp } from "@dnd-table/shared";

export type { AppliedOp, TablePatchOp } from "@dnd-table/shared";

export type SyncStatus = "idle" | "syncing" | "ok" | "error" | "conflict";

export type PatchConflict = {
  opId: string;
  key: string;
  expectedVersion: number;
  actualVersion: number | null;
};

export type UnackedObjectDto = {
  type: string;
  x: number;
  y: number;
  sortOrder?: number;
  props?: Record<string, unknown>;
};

export type AmendUnackedResult = "merged" | "deferred" | "no_target";

type PatchAck = {
  success?: boolean;
  status?: number;
  error?: string;
  message?: string;
  applied?: AppliedOp[];
  conflicts?: PatchConflict[];
};

type UpdatePatch = {
  x?: number;
  y?: number;
  sortOrder?: number;
  props?: Record<string, unknown>;
};

function newOpId() {
  return `op-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function mergePatchIntoCreate(
  create: Extract<TablePatchOp, { action: "create" }>,
  patch: UpdatePatch
) {
  if (patch.x !== undefined) create.object.x = patch.x;
  if (patch.y !== undefined) create.object.y = patch.y;
  if (patch.sortOrder !== undefined) create.object.sortOrder = patch.sortOrder;
  if (patch.props !== undefined) create.object.props = patch.props;
}

function mergeUpdateIntoCreate(create: TablePatchOp, update: TablePatchOp) {
  if (create.action !== "create" || update.action !== "update") return;
  mergePatchIntoCreate(create, update.patch);
}

function sortOpsForSend(ops: TablePatchOp[]): TablePatchOp[] {
  const rank = (op: TablePatchOp) => (op.action === "create" ? 0 : op.action === "update" ? 1 : 2);
  return [...ops].sort((a, b) => rank(a) - rank(b));
}

function mergeDeferredUpdate(prev: TablePatchOp | undefined, op: TablePatchOp): TablePatchOp {
  if (prev && prev.action === "update" && op.action === "update") {
    return {
      ...prev,
      patch: { ...prev.patch, ...op.patch },
    };
  }
  return op;
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
  /** Unacked creates cancelled locally while still in flight — delete on ack. */
  private cancelledInFlightCreates = new Set<string>();

  private params: {
    tableId: string;
    clientId: string;
    socket: Socket;
    setStatus: (s: SyncStatus) => void;
    onConflict: (conflicts: PatchConflict[]) => Promise<void>;
    onBroadcast: (applied: AppliedOp[]) => void;
  };

  constructor(params: {
    tableId: string;
    clientId: string;
    socket: Socket;
    setStatus: (s: SyncStatus) => void;
    onConflict: (conflicts: PatchConflict[]) => Promise<void>;
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

  isCreatePendingOrInFlight(key: string): boolean {
    if (this.inFlightCreates.has(key)) return true;
    return this.pending.some((p) => p.action === "create" && p.key === key);
  }

  /**
   * Amend a pending or in-flight create with a patch. Never enqueues a standalone update.
   */
  amendUnackedUpdate(key: string, patch: UpdatePatch): AmendUnackedResult {
    const pendingCreateIdx = this.pending.findIndex(
      (p) => p.action === "create" && p.key === key
    );
    if (pendingCreateIdx >= 0) {
      const create = this.pending[pendingCreateIdx];
      if (create.action === "create") {
        mergePatchIntoCreate(create, patch);
      }
      this.scheduleFlush();
      return "merged";
    }

    if (this.inFlightCreates.has(key)) {
      const op: TablePatchOp = {
        opId: newOpId(),
        action: "update",
        key,
        baseVersion: 1,
        patch,
      };
      const prev = this.deferredUpdates.get(key);
      this.deferredUpdates.set(key, mergeDeferredUpdate(prev, op));
      return "deferred";
    }

    return "no_target";
  }

  /**
   * Queue or amend a create for an unacked object. Skips if the key is already in flight
   * (use amendUnackedUpdate instead).
   */
  upsertUnackedCreate(key: string, object: UnackedObjectDto): "pending" | "deferred" | "skipped_in_flight" {
    const pendingCreateIdx = this.pending.findIndex(
      (p) => p.action === "create" && p.key === key
    );
    if (pendingCreateIdx >= 0) {
      const create = this.pending[pendingCreateIdx];
      if (create.action === "create") {
        create.object = {
          type: object.type,
          x: object.x,
          y: object.y,
          sortOrder: object.sortOrder,
          props: object.props,
        };
      }
      this.scheduleFlush();
      return "pending";
    }

    if (this.inFlightCreates.has(key)) {
      const op: TablePatchOp = {
        opId: newOpId(),
        action: "update",
        key,
        baseVersion: 1,
        patch: {
          x: object.x,
          y: object.y,
          sortOrder: object.sortOrder,
          props: object.props,
        },
      };
      const prev = this.deferredUpdates.get(key);
      this.deferredUpdates.set(key, mergeDeferredUpdate(prev, op));
      return "deferred";
    }

    this.pending.push({
      opId: newOpId(),
      action: "create",
      key,
      object: {
        type: object.type,
        x: object.x,
        y: object.y,
        sortOrder: object.sortOrder ?? 0,
        props: object.props ?? {},
      },
    });
    this.scheduleFlush();
    return "pending";
  }

  /** Drop a pending/in-flight unacked create without sending delete to the server. */
  cancelUnackedCreate(key: string) {
    this.pending = this.pending.filter((p) => !(p.action === "create" && p.key === key));
    this.deferredUpdates.delete(key);
    if (this.inFlightCreates.has(key)) {
      this.cancelledInFlightCreates.add(key);
    }
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
        this.deferredUpdates.set(op.key, mergeDeferredUpdate(prev, op));
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

      if (this.cancelledInFlightCreates.has(op.key)) {
        this.cancelledInFlightCreates.delete(op.key);
        this.deferredUpdates.delete(op.key);
        this.pending.push({
          opId: newOpId(),
          action: "delete",
          key: op.key,
          baseVersion: op.version,
        });
        continue;
      }

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

  private requeueBatchAfterConflict(batch: TablePatchOp[], conflicts: PatchConflict[]) {
    const conflictOpIds = new Set(conflicts.map((c) => c.opId));
    const serverHasObject = new Set(
      conflicts.filter((c) => c.actualVersion !== null).map((c) => c.key)
    );

    for (const op of batch) {
      if (op.action === "create") {
        this.inFlightCreates.delete(op.key);
        if (serverHasObject.has(op.key)) {
          this.deferredUpdates.delete(op.key);
        }
      }
    }

    const toRequeue = batch.filter((op) => !conflictOpIds.has(op.opId));
    this.pending = toRequeue.concat(this.pending);
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
          const conflicts = ack.conflicts ?? [];
          for (const c of conflicts) {
            console.warn("[TableSync] VERSION_CONFLICT", {
              key: c.key,
              expectedVersion: c.expectedVersion,
              actualVersion: c.actualVersion,
            });
          }
          this.params.setStatus("conflict");
          this.requeueBatchAfterConflict(batch, conflicts);
          try {
            await this.params.onConflict(conflicts);
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
