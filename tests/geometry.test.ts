import { describe, expect, it } from "vitest";
import {
  getObjectAabb,
  getObjectSize,
  objectInRect,
  screenToWorld,
  worldToScreen,
} from "../frontend/src/tabletop/geometry";
import type { TableObjectState } from "../frontend/src/tabletop/model";
import type { TabletopBaseObject } from "@dnd-table/shared";

const makeObject = (overrides: Partial<TabletopBaseObject> = {}): TabletopBaseObject => ({
  id: "o-1",
  type: "shape",
  transform: {
    position: { x: 100, y: 200, z: 0 },
    scale: { x: 1, y: 1 },
    rotation: 0,
    lockRotation: false,
    lockScale: false,
  },
  appearance: { shape: "rectangle" },
  metadata: { kind: "shape", width: 50, height: 30 },
  groupId: null,
  layerId: null,
  ...overrides,
});

const wrap = (o: TabletopBaseObject): TableObjectState => ({
  key: o.id,
  version: 1,
  sortOrder: 0,
  obj: o,
});

describe("geometry", () => {
  it("screenToWorld + worldToScreen round-trip", () => {
    const stagePos = { x: 10, y: 20 };
    const scale = 2;
    const w = screenToWorld(50, 80, stagePos, scale);
    const s = worldToScreen(w.x, w.y, stagePos, scale);
    expect(s.x).toBeCloseTo(50);
    expect(s.y).toBeCloseTo(80);
  });

  it("getObjectSize defaults width/height when missing", () => {
    const obj = makeObject({ metadata: { kind: "shape" } });
    const size = getObjectSize(obj);
    expect(size.width).toBe(120);
    expect(size.height).toBe(80);
    expect(size.isChip).toBe(false);
  });

  it("getObjectSize identifies chips", () => {
    const obj = makeObject({ metadata: { kind: "chip", radius: 16 } });
    const size = getObjectSize(obj);
    expect(size.isChip).toBe(true);
    expect(size.radius).toBe(16);
  });

  it("getObjectAabb wraps non-rotated rect tightly", () => {
    const obj = makeObject({
      transform: {
        position: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1 },
        rotation: 0,
        lockRotation: false,
        lockScale: false,
      },
      metadata: { kind: "shape", width: 100, height: 50 },
    });
    const aabb = getObjectAabb(wrap(obj));
    expect(aabb).toEqual({ left: 0, right: 100, top: 0, bottom: 50 });
  });

  it("getObjectAabb expands AABB for rotated rect", () => {
    const obj = makeObject({
      transform: {
        position: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1 },
        rotation: 45,
        lockRotation: false,
        lockScale: false,
      },
      metadata: { kind: "shape", width: 100, height: 50 },
    });
    const aabb = getObjectAabb(wrap(obj));
    // 45° rotation makes the bounding box larger than original
    expect(aabb.right - aabb.left).toBeGreaterThan(100);
    expect(aabb.bottom - aabb.top).toBeGreaterThan(50);
  });

  it("getObjectAabb for a chip uses radius around centre", () => {
    const obj = makeObject({
      type: "shape",
      transform: {
        position: { x: 50, y: 80, z: 0 },
        scale: { x: 1, y: 1 },
        rotation: 0,
        lockRotation: false,
        lockScale: false,
      },
      metadata: { kind: "chip", radius: 10 },
    });
    expect(getObjectAabb(wrap(obj))).toEqual({ left: 40, right: 60, top: 70, bottom: 90 });
  });

  it("objectInRect returns true when AABBs overlap", () => {
    const obj = makeObject({
      transform: {
        position: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1 },
        rotation: 0,
        lockRotation: false,
        lockScale: false,
      },
      metadata: { kind: "shape", width: 100, height: 100 },
    });
    expect(objectInRect(wrap(obj), { left: -10, right: 10, top: -10, bottom: 10 })).toBe(true);
    expect(objectInRect(wrap(obj), { left: 200, right: 300, top: 200, bottom: 300 })).toBe(false);
  });
});
