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
});
