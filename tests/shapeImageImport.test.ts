import { describe, expect, it } from "vitest";
import { createTabletopShape } from "../frontend/src/tabletop/shapes";
import {
  resolvePasteShapeVariant,
  resolveShapeImageImport,
} from "../frontend/src/tabletop/appearance/shapeImageImport";
import { TRANSPARENT_FILL } from "../frontend/src/tabletop/appearance";
import type { TableObjectState } from "../frontend/src/tabletop/model";

describe("resolvePasteShapeVariant", () => {
  it("uses rectangle unless shape tool with ellipse", () => {
    expect(resolvePasteShapeVariant("select", "ellipse")).toBe("rectangle");
    expect(resolvePasteShapeVariant("pan", "ellipse")).toBe("rectangle");
    expect(resolvePasteShapeVariant("shape", "ellipse")).toBe("ellipse");
    expect(resolvePasteShapeVariant("shape", "rectangle")).toBe("rectangle");
  });
});

describe("resolveShapeImageImport", () => {
  const shape = createTabletopShape(
    "rectangle",
    { x: 10, y: 20, width: 100, height: 50 },
    { key: "shape-1" }
  );
  const objects: TableObjectState[] = [{ key: "shape-1", version: 1, sortOrder: 0, obj: shape }];

  it("attaches sprite to single selected shape", () => {
    const result = resolveShapeImageImport({
      sprite: "data:image/png;base64,x",
      width: 80,
      height: 80,
      centerX: 0,
      centerY: 0,
      pasteShapeVariant: "rectangle",
      selectedKeys: ["shape-1"],
      objects,
      nextKey: () => "shape-new",
    });
    expect(result.action).toBe("attach");
    if (result.action === "attach") {
      expect(result.key).toBe("shape-1");
      expect(result.obj.appearance?.sprite).toBe("data:image/png;base64,x");
      expect(result.obj.appearance?.fillColor).toBe(TRANSPARENT_FILL);
    }
  });

  it("creates new shape when nothing selected", () => {
    const result = resolveShapeImageImport({
      sprite: "data:image/png;base64,y",
      width: 120,
      height: 80,
      centerX: 200,
      centerY: 150,
      pasteShapeVariant: "ellipse",
      selectedKeys: [],
      objects,
      nextKey: () => "shape-new",
    });
    expect(result.action).toBe("create");
    if (result.action === "create") {
      expect(result.key).toBe("shape-new");
      expect(result.obj.appearance?.shape).toBe("ellipse");
      expect(result.obj.transform.position.x).toBe(140);
      expect(result.obj.transform.position.y).toBe(110);
    }
  });
});
