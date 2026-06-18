import { describe, expect, it } from "vitest";
import type { TabletopBaseObject } from "@dnd-table/shared";
import { applyBroadcastToObjects } from "../frontend/src/pages/sessionTable/helpers";
import { ObjectMutationPlanner } from "../frontend/src/tabletop/sync/ObjectMutationPlanner";
import { TableObjectHydrator } from "../frontend/src/tabletop/sync/TableObjectHydrator";
import type { TableObjectState } from "../frontend/src/tabletop/model";

describe("transform sync (acked vs unacked)", () => {
  const ackedShape = {
    key: "shape-1",
    version: 3,
    sortOrder: 0,
    obj: {
      type: "shape",
      id: "shape-1",
      ownerUserId: null,
      transform: { position: { x: 100, y: 200 }, rotation: 0, scale: { x: 1, y: 1 } },
      appearance: { fillColor: "#3366ff" },
    } as unknown as TabletopBaseObject,
  } satisfies TableObjectState;

  it("planTransformCommitAcked includes full props with new position", () => {
    const planner = new ObjectMutationPlanner({ current: new Set() });
    const plan = planner.planTransformCommitAcked(ackedShape, ackedShape.obj);
    expect(plan?.bumpVersion).toBe(true);
    expect(plan?.patch.x).toBe(100);
    expect(plan?.patch.y).toBe(200);
    expect(plan?.patch.props).toBeDefined();
    const props = plan?.patch.props as { transform?: { position?: { x: number; y: number } } };
    expect(props.transform?.position).toEqual({ x: 100, y: 200 });
  });

  it("planTransformCommitUnacked sends only x and y", () => {
    const planner = new ObjectMutationPlanner({ current: new Set(["shape-pasted"]) });
    const pasted = {
      key: "shape-pasted",
      version: 1,
      sortOrder: 0,
      obj: {
        type: "shape",
        id: "shape-pasted",
        transform: { position: { x: 50, y: 60 }, rotation: 0, scale: { x: 1, y: 1 } },
        appearance: {},
      } as unknown as TabletopBaseObject,
    } satisfies TableObjectState;
    const plan = planner.planTransformCommitUnacked(pasted, pasted.obj);
    expect(plan.bumpVersion).toBe(false);
    expect(plan.patch).toEqual({ x: 50, y: 60 });
    expect(plan.patch.props).toBeUndefined();
  });

  it("applyBroadcastToObjects applies x/y position-only patch to remote client", () => {
    const local: TableObjectState = {
      key: "shape-1",
      version: 2,
      sortOrder: 0,
      obj: {
        type: "shape",
        id: "shape-1",
        transform: { position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 } },
        appearance: { fillColor: "#3366ff" },
      } as unknown as TabletopBaseObject,
    };

    const next = applyBroadcastToObjects([local], [
      {
        opId: "u1",
        action: "update",
        key: "shape-1",
        baseVersion: 2,
        version: 3,
        patch: { x: 120, y: 80 },
      },
    ]);

    expect(next[0]?.obj.transform.position).toEqual({ x: 120, y: 80 });
    expect(next[0]?.version).toBe(3);
  });

  it("TableObjectHydrator.fromDto reconciles dto.x/y with props.transform", () => {
    const state = TableObjectHydrator.fromDto({
      id: "shape-1",
      key: "shape-1",
      version: 2,
      type: "shape",
      x: 500,
      y: 600,
      sortOrder: 0,
      props: {
        type: "shape",
        transform: { position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 } },
        appearance: {},
      },
    });
    expect(state?.obj.transform.position).toEqual({ x: 500, y: 600 });
  });
});
