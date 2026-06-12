import { describe, expect, it } from "vitest";
import {
  resolveDesktopContextMenu,
  resolveLongPressMenu,
} from "../frontend/src/pages/sessionTable/input/resolveContextMenu";

describe("resolveDesktopContextMenu", () => {
  const hit = { key: "a", obj: {} } as { key: string; obj: object };

  it("returns single object menu on hit without multi-select", () => {
    const r = resolveDesktopContextMenu({
      hit,
      selectedKeys: [],
      selectedKey: null,
    });
    expect(r.menuKeys).toEqual(["a"]);
    expect(r.selectKeys).toEqual(["a"]);
  });

  it("returns group menu when right-clicking object in multi-select", () => {
    const r = resolveDesktopContextMenu({
      hit,
      selectedKeys: ["a", "b"],
      selectedKey: "a",
    });
    expect(r.menuKeys).toEqual(["a", "b"]);
    expect(r.selectKey).toBe("a");
  });

  it("returns group menu on empty with selection", () => {
    const r = resolveDesktopContextMenu({
      hit: null,
      selectedKeys: ["x", "y"],
      selectedKey: "x",
    });
    expect(r.menuKeys).toEqual(["x", "y"]);
  });
});

describe("resolveLongPressMenu", () => {
  const hit = { key: "a", obj: {} } as { key: string; obj: object };

  it("selects only on unselected object", () => {
    const r = resolveLongPressMenu({
      hit,
      selectedKeys: [],
      selectedKey: null,
    });
    expect(r).toEqual({
      action: "selectOnly",
      selectKey: "a",
      selectKeys: ["a"],
    });
  });

  it("opens group menu on empty with selection", () => {
    const r = resolveLongPressMenu({
      hit: null,
      selectedKeys: ["x", "y"],
      selectedKey: "x",
    });
    expect(r.action).toBe("openMenu");
    if (r.action === "openMenu") {
      expect(r.menuKeys).toEqual(["x", "y"]);
    }
  });

  it("opens group menu on selected object in multi-select", () => {
    const r = resolveLongPressMenu({
      hit,
      selectedKeys: ["a", "b"],
      selectedKey: "a",
    });
    expect(r.action).toBe("openMenu");
    if (r.action === "openMenu") {
      expect(r.menuKeys).toEqual(["a", "b"]);
    }
  });
});
