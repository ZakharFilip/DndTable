import { describe, expect, it } from "vitest";
import { TableController } from "../frontend/src/tabletop/controller/TableController";

describe("TableController.wheelZoom", () => {
  it("clamps scale to maxScale on positive zoom", () => {
    const c = new TableController({ minScale: 0.1, maxScale: 5, wheelScaleBy: 1.5 });
    let stagePos = { x: 0, y: 0 };
    let scale = 4.5;
    for (let i = 0; i < 10; i++) {
      const r = c.wheelZoom({
        input: { deltaY: -100, pointer: { x: 0, y: 0 } },
        stagePos,
        scale,
      });
      stagePos = r.stagePos;
      scale = r.scale;
    }
    expect(scale).toBeLessThanOrEqual(5);
  });

  it("clamps scale to minScale on negative zoom", () => {
    const c = new TableController({ minScale: 0.25, maxScale: 5, wheelScaleBy: 1.5 });
    let stagePos = { x: 0, y: 0 };
    let scale = 0.3;
    for (let i = 0; i < 10; i++) {
      const r = c.wheelZoom({
        input: { deltaY: 100, pointer: { x: 0, y: 0 } },
        stagePos,
        scale,
      });
      stagePos = r.stagePos;
      scale = r.scale;
    }
    expect(scale).toBeGreaterThanOrEqual(0.25);
  });
});

describe("TableController drag", () => {
  it("applies a delta to dragged keys only", () => {
    const c = new TableController();
    c.startDrag({
      keys: ["a", "b"],
      startWorld: { x: 0, y: 0 },
      objects: [
        { key: "a", x: 10, y: 20 },
        { key: "b", x: 30, y: 40 },
        { key: "c", x: 100, y: 100 },
      ],
    });

    const move = c.moveDrag({ world: { x: 5, y: -3 } });
    expect(move).not.toBeNull();

    const objects = [
      {
        key: "a",
        obj: { transform: { position: { x: 10, y: 20 } } },
      },
      {
        key: "b",
        obj: { transform: { position: { x: 30, y: 40 } } },
      },
      {
        key: "c",
        obj: { transform: { position: { x: 100, y: 100 } } },
      },
    ];

    const next = c.applyDragToObjects(objects, move!);
    expect(next.find((o) => o.key === "a")!.obj.transform.position).toEqual({ x: 15, y: 17 });
    expect(next.find((o) => o.key === "b")!.obj.transform.position).toEqual({ x: 35, y: 37 });
    // unrelated object untouched
    expect(next.find((o) => o.key === "c")!.obj.transform.position).toEqual({ x: 100, y: 100 });
  });

  it("endDrag returns dragged keys and resets state", () => {
    const c = new TableController();
    c.startDrag({
      keys: ["a"],
      startWorld: { x: 0, y: 0 },
      objects: [{ key: "a", x: 0, y: 0 }],
    });
    const keys = c.endDrag();
    expect(keys).toEqual(["a"]);
    // After end, moveDrag should not produce a move
    expect(c.moveDrag({ world: { x: 100, y: 100 } })).toBeNull();
  });
});
