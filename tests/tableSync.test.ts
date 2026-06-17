import { describe, expect, it, vi } from "vitest";
import { TableSync } from "../frontend/src/tabletop/realtime/TableSync";

function stubWindowTimers() {
  const timeouts: Array<() => void> = [];
  let now = 0;
  vi.spyOn(Date, "now").mockImplementation(() => now);
  vi.stubGlobal("window", {
    setTimeout: (fn: () => void, delay?: number) => {
      timeouts.push(() => {
        now += delay ?? 0;
        fn();
      });
      return timeouts.length;
    },
    clearTimeout: () => {},
  });
  return {
    flush: () => timeouts.splice(0).forEach((fn) => fn()),
    advance: (ms: number) => {
      now += ms;
    },
    restore: () => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    },
  };
}

describe("TableSync", () => {
  it("ignores own broadcast but applies remote broadcasts", () => {
    let handler: ((payload: unknown) => void) | undefined;
    const socket = {
      emit: vi.fn(),
      on: vi.fn((_event: string, cb: (payload: unknown) => void) => {
        handler = cb;
      }),
      off: vi.fn(),
    } as unknown as import("socket.io-client").Socket;

    const onBroadcast = vi.fn();
    const sync = new TableSync({
      tableId: "t1",
      clientId: "c1",
      socket,
      setStatus: () => {},
      onConflict: async () => {},
      onBroadcast,
    });
    sync.start();

    handler?.({
      tableId: "t1",
      clientId: "c1",
      applied: [{ opId: "x", action: "update", key: "a", baseVersion: 1, version: 2, patch: {} }],
    });
    expect(onBroadcast).not.toHaveBeenCalled();

    handler?.({
      tableId: "t1",
      clientId: "c2",
      applied: [{ opId: "y", action: "update", key: "b", baseVersion: 1, version: 2, patch: {} }],
    });
    expect(onBroadcast).toHaveBeenCalledTimes(1);
  });

  it("merges update into a pending create for the same key", () => {
    const timers = stubWindowTimers();

    let capturedOps: unknown;
    const socket = {
      emit: vi.fn((_event: string, payload: { ops: unknown[] }, ack?: (resp: unknown) => void) => {
        capturedOps = payload.ops;
        ack?.({ success: true, applied: [] });
      }),
      on: vi.fn(),
      off: vi.fn(),
    } as unknown as import("socket.io-client").Socket;

    const sync = new TableSync({
      tableId: "t1",
      clientId: "c1",
      socket,
      setStatus: () => {},
      onConflict: async () => {},
      onBroadcast: () => {},
    });

    sync.enqueue([
      {
        opId: "c1",
        action: "create",
        key: "shape-1",
        object: { type: "shape", x: 0, y: 0, sortOrder: 0, props: {} },
      },
    ]);
    sync.enqueue([
      {
        opId: "u1",
        action: "update",
        key: "shape-1",
        baseVersion: 1,
        patch: { x: 40, y: 50 },
      },
    ]);
    timers.flush();

    const ops = capturedOps as Array<{ action: string; object?: { x: number; y: number } }>;
    expect(ops).toHaveLength(1);
    expect(ops[0]?.action).toBe("create");
    expect(ops[0]?.object?.x).toBe(40);
    expect(ops[0]?.object?.y).toBe(50);

    timers.restore();
  });

  it("amendUnackedUpdate defers while create is in flight", async () => {
    const timers = stubWindowTimers();

    let pendingAck: ((resp: unknown) => void) | undefined;
    const socket = {
      emit: vi.fn((_event: string, payload: { ops: unknown[] }, ack?: (resp: unknown) => void) => {
        pendingAck = ack;
        void payload;
      }),
      on: vi.fn(),
      off: vi.fn(),
    } as unknown as import("socket.io-client").Socket;

    const sync = new TableSync({
      tableId: "t1",
      clientId: "c1",
      socket,
      setStatus: () => {},
      onConflict: async () => {},
      onBroadcast: () => {},
    });

    sync.enqueue([
      {
        opId: "c1",
        action: "create",
        key: "shape-1",
        object: { type: "shape", x: 0, y: 0, sortOrder: 0, props: {} },
      },
    ]);
    timers.flush();

    expect(sync.isCreatePendingOrInFlight("shape-1")).toBe(true);
    expect(sync.amendUnackedUpdate("shape-1", { x: 99, y: 88 })).toBe("deferred");

    let secondBatch: unknown;
    (socket.emit as ReturnType<typeof vi.fn>).mockImplementation(
      (_event: string, payload: { ops: unknown[] }, ack?: (resp: unknown) => void) => {
        secondBatch = payload.ops;
        ack?.({ success: true, applied: [] });
      }
    );

    pendingAck?.({
      success: true,
      applied: [
        {
          opId: "c1",
          action: "create",
          key: "shape-1",
          version: 1,
          object: { type: "shape", x: 0, y: 0, sortOrder: 0, props: {} },
        },
      ],
    });
    await Promise.resolve();
    timers.advance(200);
    timers.flush();

    const ops = secondBatch as Array<{ action: string; patch?: { x: number; y: number } }> | undefined;
    expect(ops).toHaveLength(1);
    expect(ops[0]?.action).toBe("update");
    expect(ops[0]?.patch?.x).toBe(99);
    expect(ops[0]?.patch?.y).toBe(88);

    timers.restore();
  });

  it("upsertUnackedCreate queues create when amend has no target", () => {
    const timers = stubWindowTimers();

    let capturedOps: unknown;
    const socket = {
      emit: vi.fn((_event: string, payload: { ops: unknown[] }, ack?: (resp: unknown) => void) => {
        capturedOps = payload.ops;
        ack?.({ success: true, applied: [] });
      }),
      on: vi.fn(),
      off: vi.fn(),
    } as unknown as import("socket.io-client").Socket;

    const sync = new TableSync({
      tableId: "t1",
      clientId: "c1",
      socket,
      setStatus: () => {},
      onConflict: async () => {},
      onBroadcast: () => {},
    });

    sync.upsertUnackedCreate("shape-new", {
      type: "shape",
      x: 10,
      y: 20,
      sortOrder: 0,
      props: { id: "shape-new" },
    });
    timers.flush();

    const ops = capturedOps as Array<{ action: string; key: string; object?: { x: number; y: number } }>;
    expect(ops).toHaveLength(1);
    expect(ops[0]?.action).toBe("create");
    expect(ops[0]?.key).toBe("shape-new");
    expect(ops[0]?.object?.x).toBe(10);

    timers.restore();
  });

  it("logs conflicts on VERSION_CONFLICT and passes them to onConflict", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const timers = stubWindowTimers();

    const conflicts = [
      {
        opId: "u1",
        key: "shape-1",
        expectedVersion: 1,
        actualVersion: null,
      },
    ];

    const socket = {
      emit: vi.fn(
        (
          _event: string,
          _payload: unknown,
          ack?: (resp: {
            status: number;
            error: string;
            conflicts: typeof conflicts;
          }) => void
        ) => {
          ack?.({
            status: 409,
            error: "VERSION_CONFLICT",
            conflicts,
          });
        }
      ),
      on: vi.fn(),
      off: vi.fn(),
    } as unknown as import("socket.io-client").Socket;

    const onConflict = vi.fn(async () => {});
    const sync = new TableSync({
      tableId: "t1",
      clientId: "c1",
      socket,
      setStatus: () => {},
      onConflict,
      onBroadcast: () => {},
    });

    sync.enqueue([
      {
        opId: "u1",
        action: "update",
        key: "shape-1",
        baseVersion: 1,
        patch: { x: 1, y: 2 },
      },
    ]);
    timers.flush();
    await Promise.resolve();

    expect(warn).toHaveBeenCalledWith("[TableSync] VERSION_CONFLICT", {
      key: "shape-1",
      expectedVersion: 1,
      actualVersion: null,
    });
    expect(onConflict).toHaveBeenCalledWith(conflicts);

    warn.mockRestore();
    timers.restore();
  });

  it("requeues batch after 409 when op was not in conflict list", async () => {
    const timers = stubWindowTimers();

    let emitCount = 0;
    const socket = {
      emit: vi.fn(
        (
          _event: string,
          payload: { ops: unknown[] },
          ack?: (resp: {
            status?: number;
            error?: string;
            success?: boolean;
            conflicts?: Array<{ opId: string; key: string; expectedVersion: number; actualVersion: null }>;
          }) => void
        ) => {
          emitCount += 1;
          if (emitCount === 1) {
            ack?.({
              status: 409,
              error: "VERSION_CONFLICT",
              conflicts: [
                { opId: "u1", key: "shape-1", expectedVersion: 1, actualVersion: null },
              ],
            });
            return;
          }
          expect(payload.ops).toHaveLength(1);
          expect((payload.ops[0] as { opId: string }).opId).toBe("c2");
          ack?.({ success: true, applied: [] });
        }
      ),
      on: vi.fn(),
      off: vi.fn(),
    } as unknown as import("socket.io-client").Socket;

    const sync = new TableSync({
      tableId: "t1",
      clientId: "c1",
      socket,
      setStatus: () => {},
      onConflict: async () => {},
      onBroadcast: () => {},
    });

    sync.enqueue([
      {
        opId: "u1",
        action: "update",
        key: "shape-1",
        baseVersion: 1,
        patch: { x: 1, y: 2 },
      },
      {
        opId: "c2",
        action: "create",
        key: "shape-2",
        object: { type: "shape", x: 0, y: 0, sortOrder: 0, props: {} },
      },
    ]);
    timers.flush();
    await Promise.resolve();
    timers.advance(200);
    timers.flush();

    expect(emitCount).toBe(2);

    timers.restore();
  });
});
