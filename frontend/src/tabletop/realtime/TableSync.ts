import type { Socket } from "socket.io-client";

export type TablePatchOp =
  | {
      opId: string;
      action: "create";
      key: string;
      object: {
        type: string;
        x: number;
        y: number;
        sortOrder?: number;
        props?: Record<string, unknown>;
      };
    }
  | {
      opId: string;
      action: "update";
      key: string;
      baseVersion: number;
      patch: { x?: number; y?: number; sortOrder?: number; props?: Record<string, unknown> };
    }
  | { opId: string; action: "delete"; key: string; baseVersion: number };

export type AppliedOp =
  | {
      opId: string;
      action: "create";
      key: string;
      version: number;
      object: { type: string; x: number; y: number; sortOrder: number; props: Record<string, unknown> };
    }
  | {
      opId: string;
      action: "update";
      key: string;
      baseVersion: number;
      version: number;
      patch: { x?: number; y?: number; sortOrder?: number; props?: Record<string, unknown> };
    }
  | { opId: string; action: "delete"; key: string; baseVersion: number; version: number };

export type SyncStatus = "idle" | "syncing" | "ok" | "error" | "conflict";

export class TableSync {
  private pending: TablePatchOp[] = [];
  private debounceTimer: number | null = null;
  private throttleTimer: number | null = null;
  private lastSendAt = 0;

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

  private async flush() {
    if (this.pending.length === 0) return;

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
    this.params.setStatus("syncing");

    this.params.socket.emit(
      "table:patch",
      { tableId: this.params.tableId, clientId: this.params.clientId, ops: batch },
      async (ack: any) => {
        if (ack?.success) {
          this.params.setStatus("ok");
          window.setTimeout(() => this.params.setStatus("idle"), 800);
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
          return;
        }
        // transient: put back and retry on next change
        this.pending = batch.concat(this.pending);
        this.params.setStatus("error");
        window.setTimeout(() => this.params.setStatus("idle"), 1500);
      }
    );
  }
}

