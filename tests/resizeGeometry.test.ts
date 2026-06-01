import { describe, expect, it } from "vitest";
import { anchorWorldAtStart, resizeFromPointer } from "../frontend/src/tabletop/controller/resizeGeometry";

describe("resizeFromPointer", () => {
  it("unrotated se handle grows width and height", () => {
    const start = { x: 0, y: 0, width: 100, height: 50, rotation: 0 };
    const anchor = anchorWorldAtStart({ ...start, handle: "se" });
    const next = resizeFromPointer({
      handle: "se",
      start,
      anchorWorld: anchor,
      pointerWorld: { x: 120, y: 70 },
    });
    expect(next.width).toBe(120);
    expect(next.height).toBe(70);
    expect(next.x).toBe(0);
    expect(next.y).toBe(0);
  });

  it("rotated object keeps anchor fixed in world", () => {
    const start = { x: 0, y: 0, width: 100, height: 50, rotation: 45 };
    const anchor = anchorWorldAtStart({ ...start, handle: "se" });
    const next = resizeFromPointer({
      handle: "se",
      start,
      anchorWorld: anchor,
      pointerWorld: { x: anchor.x + 40, y: anchor.y + 10 },
    });
    const anchorAfter = anchorWorldAtStart({
      x: next.x,
      y: next.y,
      width: next.width,
      height: next.height,
      rotation: 45,
      handle: "se",
    });
    expect(anchorAfter.x).toBeCloseTo(anchor.x, 5);
    expect(anchorAfter.y).toBeCloseTo(anchor.y, 5);
  });
});
