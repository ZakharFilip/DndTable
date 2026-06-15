import { describe, expect, it } from "vitest";
import {
  dedupeLayersById,
  defaultBaseLayer,
  resolveLayersFromSession,
} from "../frontend/src/pages/sessionTable/helpers";
import type { Layer } from "../frontend/src/tabletop/model";

describe("dedupeLayersById", () => {
  it("keeps one layer per id (higher version wins)", () => {
    const layers: Layer[] = [
      { ...defaultBaseLayer(), version: 1, name: "Base A" },
      { ...defaultBaseLayer(), version: 2, name: "Base B" },
    ];
    const result = dedupeLayersById(layers);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Base B");
  });
});

describe("resolveLayersFromSession", () => {
  it("dedupes layer rows from server", () => {
    const rows: Layer[] = [
      defaultBaseLayer(),
      { ...defaultBaseLayer(), version: 2, name: "Base duplicate" },
    ];
    const { layers, shouldSyncDefaultLayer } = resolveLayersFromSession(rows, []);
    expect(layers).toHaveLength(1);
    expect(layers[0].name).toBe("Base duplicate");
    expect(shouldSyncDefaultLayer).toBe(false);
  });
});
