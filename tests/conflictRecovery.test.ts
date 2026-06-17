import { describe, expect, it } from "vitest";
import type { TabletopBaseObject } from "@dnd-table/shared";
import type { TableObjectState } from "../frontend/src/tabletop/model";
import { sanitizePropsForSync } from "../frontend/src/tabletop/sync/ObjectMutationPlanner";

/** Mirrors SessionTablePage surgical conflict merge: only conflicted keys pull from server. */
function mergeObjectsAfterConflict(
  localObjects: TableObjectState[],
  serverObjects: TableObjectState[],
  conflicts: Array<{ key: string; actualVersion: number | null }>,
  pendingBefore: string[]
): TableObjectState[] {
  const conflictKeys = new Set(conflicts.map((c) => c.key));
  const serverByKey = new Map(serverObjects.map((o) => [o.key, o]));
  const localUnacked = localObjects.filter((o) => pendingBefore.includes(o.key));

  const next = localObjects.map((local) => {
    if (!conflictKeys.has(local.key)) return local;
    const server = serverByKey.get(local.key);
    const conflict = conflicts.find((c) => c.key === local.key);
    if (!server) {
      if (pendingBefore.includes(local.key)) return local;
      return local;
    }
    if (conflict?.actualVersion != null) {
      return { ...server, version: conflict.actualVersion };
    }
    return server;
  });

  for (const local of localUnacked) {
    if (!serverByKey.has(local.key) && !next.some((o) => o.key === local.key)) {
      next.push(local);
    }
  }

  return next;
}

describe("conflict recovery merge", () => {
  it("preserves local unacked objects not yet on server", () => {
    const serverObjects: TableObjectState[] = [
      {
        key: "shape-existing",
        version: 2,
        sortOrder: 0,
        obj: {
          type: "shape",
          id: "shape-existing",
          transform: { position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 } },
        } as TabletopBaseObject,
      },
    ];

    const localUnacked: TableObjectState[] = [
      {
        key: "shape-pasted",
        version: 1,
        sortOrder: 1,
        obj: {
          type: "shape",
          id: "shape-pasted",
          ownerUserId: null,
          transform: { position: { x: 40, y: 50 }, rotation: 0, scale: { x: 1, y: 1 } },
          appearance: { fillColor: "#ff0000" },
        } as TabletopBaseObject,
      },
    ];

    const merged = mergeObjectsAfterConflict(
      localUnacked,
      serverObjects,
      [{ key: "shape-pasted", actualVersion: null }],
      ["shape-pasted"]
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]?.key).toBe("shape-pasted");
    expect(merged[0]?.obj.transform.position).toEqual({ x: 40, y: 50 });
  });

  it("does not overwrite non-conflicted local objects", () => {
    const serverObjects: TableObjectState[] = [
      {
        key: "shape-a",
        version: 1,
        sortOrder: 0,
        obj: {
          type: "shape",
          id: "shape-a",
          transform: { position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 } },
        } as TabletopBaseObject,
      },
    ];
    const localObjects: TableObjectState[] = [
      {
        key: "shape-a",
        version: 2,
        sortOrder: 0,
        obj: {
          type: "shape",
          id: "shape-a",
          transform: { position: { x: 100, y: 200 }, rotation: 0, scale: { x: 1, y: 1 } },
        } as TabletopBaseObject,
      },
      {
        key: "shape-b",
        version: 1,
        sortOrder: 1,
        obj: {
          type: "shape",
          id: "shape-b",
          transform: { position: { x: 50, y: 60 }, rotation: 0, scale: { x: 1, y: 1 } },
        } as TabletopBaseObject,
      },
    ];

    const merged = mergeObjectsAfterConflict(
      localObjects,
      serverObjects,
      [{ key: "shape-a", actualVersion: 1 }],
      []
    );

    expect(merged.find((o) => o.key === "shape-b")?.obj.transform.position).toEqual({
      x: 50,
      y: 60,
    });
    expect(merged.find((o) => o.key === "shape-a")?.version).toBe(1);
  });

  it("sanitizePropsForSync strips ownerUserId for retry create DTO", () => {
    const obj = {
      type: "shape",
      id: "shape-pasted",
      ownerUserId: "user-1",
      transform: { position: { x: 1, y: 2 }, rotation: 0, scale: { x: 1, y: 1 } },
    } as unknown as TabletopBaseObject;

    const sanitized = sanitizePropsForSync(obj);
    expect(sanitized.ok).toBe(true);
    if (sanitized.ok) {
      expect((sanitized.props as { ownerUserId?: string }).ownerUserId).toBeNull();
    }
  });
});
