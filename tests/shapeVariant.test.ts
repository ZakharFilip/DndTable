import { describe, expect, it } from "vitest";
import {
  ShapeVariantRegistry,
  createTabletopShape,
  type ShapeVariantId,
} from "../frontend/src/tabletop/shapes";

describe("ShapeVariantRegistry", () => {
  it("lists rectangle and ellipse variants", () => {
    const list = ShapeVariantRegistry.list();
    expect(list).toHaveLength(2);
    expect(list.map((v) => v.id).sort()).toEqual(["ellipse", "rectangle"]);
  });

  it("gets variant by id", () => {
    expect(ShapeVariantRegistry.get("rectangle").appearanceShape).toBe("rectangle");
    expect(ShapeVariantRegistry.get("ellipse").appearanceShape).toBe("ellipse");
  });
});

describe("createTabletopShape", () => {
  const bounds = { x: 10, y: 20, width: 100, height: 50 };

  it.each<[ShapeVariantId, "rectangle" | "ellipse"]>([
    ["rectangle", "rectangle"],
    ["ellipse", "ellipse"],
  ])("creates %s shape", (variantId, appearanceShape) => {
    const obj = createTabletopShape(variantId, bounds, { key: "shape-1" });
    expect(obj.type).toBe("shape");
    expect(obj.appearance?.shape).toBe(appearanceShape);
    expect(obj.metadata).toMatchObject({
      kind: "shape",
      width: 100,
      height: 50,
    });
    expect(obj.transform.position).toEqual({ x: 10, y: 20, z: 0 });
  });

  it("passes sprite and fill options", () => {
    const obj = createTabletopShape("rectangle", bounds, {
      key: "shape-2",
      sprite: "data:image/png;base64,abc",
      fillColor: "rgba(0,0,0,0)",
    });
    expect(obj.appearance?.sprite).toBe("data:image/png;base64,abc");
    expect(obj.appearance?.fillColor).toBe("rgba(0,0,0,0)");
  });
});
