import { describe, expect, it } from "vitest";
import type { TabletopBaseObject } from "@dnd-table/shared";
import type { TableObjectState } from "../frontend/src/tabletop/model";
import { sanitizePropsForSync } from "../frontend/src/tabletop/sync/ObjectMutationPlanner";

/** Mirrors SessionTablePage conflict merge: keep local unacked objects missing on server. */
function mergeObjectsAfterConflict(
  serverObjects: TableObjectState[],
  localUnacked: TableObjectState[]
): TableObjectState[] {
  const serverKeys = new Set(serverObjects.map((o) => o.key));
  const preserved = localUnacked.filter((o) => !serverKeys.has(o.key));
  return [...serverObjects, ...preserved];
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

    const merged = mergeObjectsAfterConflict(serverObjects, localUnacked);
    expect(merged).toHaveLength(2);
    expect(merged.some((o) => o.key === "shape-pasted")).toBe(true);
    expect(merged.find((o) => o.key === "shape-pasted")?.obj.transform.position).toEqual({
      x: 40,
      y: 50,
    });
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
