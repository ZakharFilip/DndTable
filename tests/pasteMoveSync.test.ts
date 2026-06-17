import { describe, expect, it, vi } from "vitest";
import type { TabletopBaseObject } from "@dnd-table/shared";
import { TableSync } from "../frontend/src/tabletop/realtime/TableSync";
import { transformPositionPatch } from "../frontend/src/pages/sessionTable/helpers";
import { ObjectMutationPlanner } from "../frontend/src/tabletop/sync/ObjectMutationPlanner";
import { sanitizePastedObjectSprite } from "../frontend/src/pages/sessionTable/hooks/useCopyPaste";

vi.mock("../frontend/src/api/sessionSprites", () => ({
  prepareSpriteForSync: vi.fn(async () => "/session-sprites/t1/uploaded.png"),
  spriteUploadErrorMessage: (err: unknown) => String(err),
}));

describe("paste → move sync", () => {
  it("transformPositionPatch sends only x and y", () => {
    const obj = {
      type: "shape",
      id: "shape-1",
      transform: { position: { x: 12, y: 34 }, rotation: 0, scale: { x: 1, y: 1 } },
      appearance: { sprite: "data:image/png;base64,abc" },
    } as unknown as TabletopBaseObject;

    const patch = transformPositionPatch(obj);
    expect(patch).toEqual({ x: 12, y: 34 });
    expect(patch).not.toHaveProperty("props");
  });

  it("sanitizePastedObjectSprite uploads data URLs", async () => {
    const obj = {
      type: "shape",
      id: "shape-1",
      appearance: { sprite: "data:image/png;base64,abc" },
      transform: { position: { x: 0, y: 0 } },
    } as unknown as TabletopBaseObject;

    const next = await sanitizePastedObjectSprite("t1", obj);
    expect(next?.appearance?.sprite).toBe("/session-sprites/t1/uploaded.png");
  });

  it("coalesces paste and drag into one create when drag happens before flush", () => {
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
        opId: "create-1",
        action: "create",
        key: "shape-1",
        object: { type: "shape", x: 0, y: 0, sortOrder: 0, props: {} },
      },
    ]);
    sync.enqueue([
      {
        opId: "move-1",
        action: "update",
        key: "shape-1",
        baseVersion: 1,
        patch: { x: 80, y: 90 },
      },
    ]);
    timeouts.splice(0).forEach((fn) => fn());

    const ops = capturedOps as Array<{
      action: string;
      object?: { x: number; y: number; props?: unknown };
    }>;
    expect(ops).toHaveLength(1);
    expect(ops[0]?.action).toBe("create");
    expect(ops[0]?.object?.x).toBe(80);
    expect(ops[0]?.object?.y).toBe(90);
    expect(ops[0]?.object?.props).toEqual({});

    vi.unstubAllGlobals();
  });

  it("planPropsCommit after paste keeps version 1 until create ack", () => {
    const planner = new ObjectMutationPlanner({ current: new Set(["shape-pasted"]) });
    const pasted = {
      key: "shape-pasted",
      version: 1,
      sortOrder: 0,
      obj: {
        type: "shape",
        id: "shape-pasted",
        ownerUserId: null,
        transform: { position: { x: 5, y: 6 }, rotation: 0, scale: { x: 1, y: 1 } },
        appearance: { fillColor: "#ff0000" },
      } as unknown as TabletopBaseObject,
    };
    const plan = planner.planPropsCommit(pasted, pasted.obj);
    expect(plan?.bumpVersion).toBe(false);
    expect(plan?.baseVersion).toBe(1);
    expect(plan?.patch.props).toBeDefined();
    expect(plan?.patch).not.toHaveProperty("x");
  });
});
