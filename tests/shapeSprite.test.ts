import { describe, expect, it } from "vitest";
import { createTabletopShape } from "../frontend/src/tabletop/shapes";
import {
  TRANSPARENT_FILL,
  attachSprite,
  detachSprite,
  hasSprite,
  isTransparentFill,
} from "../frontend/src/tabletop/appearance";

describe("ShapeFill", () => {
  it("detects transparent fills", () => {
    expect(isTransparentFill(TRANSPARENT_FILL)).toBe(true);
    expect(isTransparentFill("rgba(0,0,0,0)")).toBe(true);
    expect(isTransparentFill("#ff0000")).toBe(false);
    expect(isTransparentFill("rgba(255,0,0,0.5)")).toBe(false);
  });
});

describe("ShapeSprite", () => {
  const base = createTabletopShape(
    "rectangle",
    { x: 0, y: 0, width: 100, height: 50 },
    { key: "s1", fillColor: "#60a5fa" }
  );

  it("attachSprite sets transparent fill and sprite url", () => {
    const next = attachSprite(base, "data:image/png;base64,x");
    expect(next.appearance?.sprite).toBe("data:image/png;base64,x");
    expect(next.appearance?.fillColor).toBe(TRANSPARENT_FILL);
    expect(hasSprite(next)).toBe(true);
  });

  it("detachSprite removes sprite", () => {
    const withSprite = attachSprite(base, "data:image/png;base64,x");
    const next = detachSprite(withSprite);
    expect(next.appearance?.sprite).toBeUndefined();
    expect(hasSprite(next)).toBe(false);
  });
});
