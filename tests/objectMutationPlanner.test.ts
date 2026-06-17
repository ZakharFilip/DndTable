import { describe, expect, it } from "vitest";
import type { TabletopBaseObject } from "@dnd-table/shared";
import {
  ObjectMutationPlanner,
  sanitizePropsForSync,
} from "../frontend/src/tabletop/sync/ObjectMutationPlanner";
import type { TableObjectState } from "../frontend/src/tabletop/model";

function state(
  key: string,
  version: number,
  overrides?: Partial<TabletopBaseObject>
): TableObjectState {
  return {
    key,
    version,
    sortOrder: 0,
    obj: {
      type: "shape",
      id: key,
      ownerUserId: "user-old",
      transform: {
        position: { x: 10, y: 20 },
        rotation: 0,
        scale: { x: 1, y: 1 },
      },
      ...overrides,
    } as TabletopBaseObject,
  };
}

describe("ObjectMutationPlanner", () => {
  it("planTransformCommit does not bump version for unacked create", () => {
    const unacked = { current: new Set(["shape-1"]) };
    const planner = new ObjectMutationPlanner(unacked);
    const s = state("shape-1", 1);
    const plan = planner.planTransformCommit(s, s.obj);
    expect(plan.bumpVersion).toBe(false);
    expect(plan.baseVersion).toBe(1);
    expect(plan.patch).toEqual({ x: 10, y: 20 });
    expect(plan.patch).not.toHaveProperty("props");
  });

  it("planTransformCommit bumps version for acked object", () => {
    const planner = new ObjectMutationPlanner({ current: new Set() });
    const s = state("shape-2", 3);
    const plan = planner.planTransformCommit(s, s.obj);
    expect(plan.bumpVersion).toBe(true);
    expect(plan.baseVersion).toBe(3);
  });

  it("planPropsCommit omits bump for unacked and strips ownerUserId", () => {
    const unacked = { current: new Set(["shape-1"]) };
    const planner = new ObjectMutationPlanner(unacked);
    const s = state("shape-1", 1);
    const plan = planner.planPropsCommit(s, s.obj);
    expect(plan).not.toBeNull();
    expect(plan!.bumpVersion).toBe(false);
    expect((plan!.patch.props as TabletopBaseObject).ownerUserId).toBeNull();
  });

  it("planPropsCommit returns null for inline sprite", () => {
    const planner = new ObjectMutationPlanner({ current: new Set() });
    const s = state("shape-1", 1, {
      appearance: { sprite: "data:image/png;base64,abc" },
    });
    expect(planner.planPropsCommit(s, s.obj)).toBeNull();
  });

  it("planFullCommit includes transform and props for acked object", () => {
    const planner = new ObjectMutationPlanner({ current: new Set() });
    const s = state("shape-1", 2);
    const nextObj = {
      ...s.obj,
      transform: {
        ...s.obj.transform,
        position: { x: 50, y: 60 },
      },
    };
    const plan = planner.planFullCommit(s, nextObj);
    expect(plan?.bumpVersion).toBe(true);
    expect(plan?.patch).toMatchObject({ x: 50, y: 60, sortOrder: 0 });
    expect(plan?.patch.props).toBeDefined();
  });
});

describe("sanitizePropsForSync", () => {
  it("rejects data URL sprites", () => {
    const result = sanitizePropsForSync({
      type: "shape",
      id: "a",
      appearance: { sprite: "data:image/png;base64,x" },
      transform: { position: { x: 0, y: 0 } },
    } as TabletopBaseObject);
    expect(result.ok).toBe(false);
  });

  it("clears ownerUserId on success", () => {
    const result = sanitizePropsForSync({
      type: "shape",
      id: "a",
      ownerUserId: "u1",
      transform: { position: { x: 0, y: 0 } },
    } as TabletopBaseObject);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect((result.props as TabletopBaseObject).ownerUserId).toBeNull();
    }
  });
});
