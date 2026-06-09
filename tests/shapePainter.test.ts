import { describe, expect, it } from "vitest";
import { createTabletopShape } from "../frontend/src/tabletop/shapes";
import { ShapePainter } from "../frontend/src/tabletop/appearance/ShapePainter";
import { TRANSPARENT_FILL } from "../frontend/src/tabletop/appearance";

describe("ShapePainter", () => {
  it("draws without throwing for shape with sprite and transparent fill", () => {
    const obj = createTabletopShape(
      "ellipse",
      { x: 0, y: 0, width: 100, height: 100 },
      { key: "s1", sprite: "data:image/png;base64,xx", fillColor: TRANSPARENT_FILL }
    );
    const canvas = { getContext: () => null } as unknown as HTMLCanvasElement;
    const ctx = {
      save: () => {},
      restore: () => {},
      translate: () => {},
      rotate: () => {},
      drawImage: () => {},
      beginPath: () => {},
      ellipse: () => {},
      rect: () => {},
      clip: () => {},
      fill: () => {},
      stroke: () => {},
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 1,
    } as unknown as CanvasRenderingContext2D;

    const img = { complete: false } as HTMLImageElement;
    const painter = new ShapePainter(() => img);
    expect(() => painter.draw({ ctx, obj, scale: 1 })).not.toThrow();
  });
});
