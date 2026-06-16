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
};

export class TableSync {
  private pending: TablePatchOp[] = [];
  private debounceTimer: number | null = null;
  private throttleTimer: number | null = null;
  private lastSendAt = 0;
  private inFlight = false;

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
      // Own ops are applied from the patch ack; skip duplicate broadcast.
      if (payload.clientId === this.params.clientId) return;
      this.params.onBroadcast(payload.applied);
    };
    this.params.socket.on("table:patchApplied", handler);
    return () => {
      this.params.socket.off("table:patchApplied", handler);
    };
  }

  enqueue(ops: TablePatchOp[]) {
    this.pending.push(...ops);
    this.scheduleFlush();
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

  private finishFlight() {
    this.inFlight = false;
    if (this.pending.length > 0) this.scheduleFlush();
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

    const batch = this.pending;
    this.pending = [];
    this.lastSendAt = now;
    this.inFlight = true;
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
          this.finishFlight();
          return;
        }
        if (ack?.status === 403 || ack?.error === "FORBIDDEN") {
          this.params.setStatus("error");
          window.setTimeout(() => this.params.setStatus("idle"), 2000);
          this.pending = batch.concat(this.pending);
          this.finishFlight();
          return;
        }
        if (ack?.status === 409 || ack?.error === "VERSION_CONFLICT") {
          this.params.setStatus("conflict");
          try {
            await this.params.onConflict();
            window.setTimeout(() => this.params.setStatus("idle"), 1200);
          } catch {
            this.params.setStatus("error");
          }
          this.finishFlight();
          return;
        }
        // transient: put back and retry on next change
        this.pending = batch.concat(this.pending);
        this.params.setStatus("error");
        window.setTimeout(() => this.params.setStatus("idle"), 1500);
        this.finishFlight();
      }
    );
  }
}
