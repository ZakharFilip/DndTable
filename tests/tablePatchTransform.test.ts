import { describe, expect, it } from "vitest";
import { syncTransformPositionInProps } from "../backend/src/modules/gamesessions/table-patch";

describe("syncTransformPositionInProps", () => {
  it("updates transform.position when x/y patch has no props", () => {
    const existing = {
      type: "shape",
      transform: { position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 } },
      appearance: { fillColor: "#fff" },
    };

    const merged = syncTransformPositionInProps(existing, 42, 99);
    expect(merged).toBeDefined();
    expect((merged as { transform: { position: { x: number; y: number } } }).transform.position).toEqual({
      x: 42,
      y: 99,
    });
    expect((merged as { appearance: { fillColor: string } }).appearance.fillColor).toBe("#fff");
  });

  it("returns undefined when props have no transform", () => {
    expect(syncTransformPositionInProps({ foo: 1 }, 1, 2)).toBeUndefined();
  });

  it("returns undefined when neither x nor y provided", () => {
    const existing = { transform: { position: { x: 1, y: 2 } } };
    expect(syncTransformPositionInProps(existing, undefined, undefined)).toBeUndefined();
  });
});
