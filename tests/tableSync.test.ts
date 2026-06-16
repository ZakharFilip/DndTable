import { describe, expect, it, vi } from "vitest";
import { TableSync } from "../frontend/src/tabletop/realtime/TableSync";

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
    const timeouts: Array<() => void> = [];
    vi.stubGlobal("window", {
      setTimeout: (fn: () => void) => {
        timeouts.push(fn);
        return timeouts.length;
      },
      clearTimeout: () => {},
    });

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
    timeouts.splice(0).forEach((fn) => fn());

    const ops = capturedOps as Array<{ action: string; object?: { x: number; y: number } }>;
    expect(ops).toHaveLength(1);
    expect(ops[0]?.action).toBe("create");
    expect(ops[0]?.object?.x).toBe(40);
    expect(ops[0]?.object?.y).toBe(50);

    vi.unstubAllGlobals();
  });

  it("logs conflicts on VERSION_CONFLICT", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const timeouts: Array<() => void> = [];
    vi.stubGlobal("window", {
      setTimeout: (fn: () => void) => {
        timeouts.push(fn);
        return timeouts.length;
      },
      clearTimeout: () => {},
    });

    const socket = {
      emit: vi.fn(
        (
          _event: string,
          _payload: unknown,
          ack?: (resp: {
            status: number;
            error: string;
            conflicts: Array<{ key: string }>;
          }) => void
        ) => {
          ack?.({
            status: 409,
            error: "VERSION_CONFLICT",
            conflicts: [{ key: "shape-1" }],
          });
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
    ]);
    timeouts.splice(0).forEach((fn) => fn());

    expect(warn).toHaveBeenCalledWith(
      "[TableSync] VERSION_CONFLICT",
      expect.arrayContaining([expect.objectContaining({ key: "shape-1" })])
    );

    warn.mockRestore();
    vi.unstubAllGlobals();
  });
});
