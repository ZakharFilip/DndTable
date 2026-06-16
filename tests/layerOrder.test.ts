import { describe, expect, it } from "vitest";
import {
  compareObjectStack,
  layerOrderOf,
  ordersFromPanelIds,
  sortLayersForPanel,
} from "../frontend/src/tabletop/layerOrder";
import type { Layer, TableObjectState } from "../frontend/src/tabletop/model";

function obj(key: string, layerId: string | null, sortOrder: number): TableObjectState {
  return {
    key,
    version: 1,
    sortOrder,
    obj: {
      id: key,
      type: "shape",
      layerId,
      groupId: null,
      transform: { position: { x: 0, y: 0, z: 0 }, rotation: 0, scale: { x: 1, y: 1 } },
      appearance: {},
      metadata: { kind: "shape" },
    },
  };
}

describe("layerOrder", () => {
  const layers: Layer[] = [
    { id: "base", key: "layer:base", version: 1, name: "Base", order: 0, visible: true, locked: false },
    { id: "top", key: "layer:top", version: 1, name: "Top", order: 1, visible: true, locked: false },
  ];

  it("layerOrderOf returns NO_LAYER_ORDER for missing layerId", () => {
    expect(layerOrderOf(null, layers)).toBe(-1);
    expect(layerOrderOf("missing", layers)).toBe(-1);
  });

  it("higher layer.order paints above when sortOrder matches", () => {
    const a = obj("a", "base", 5);
    const b = obj("b", "top", 5);
    expect(compareObjectStack(a, b, layers)).toBeLessThan(0);
    expect(compareObjectStack(b, a, layers)).toBeGreaterThan(0);
  });

  it("sortLayersForPanel puts highest order first", () => {
    const sorted = sortLayersForPanel(layers);
    expect(sorted.map((l) => l.id)).toEqual(["top", "base"]);
  });

  it("ordersFromPanelIds assigns max order to first panel row", () => {
    const map = ordersFromPanelIds(["top", "base"]);
    expect(map.get("top")).toBe(1);
    expect(map.get("base")).toBe(0);
  });
});
