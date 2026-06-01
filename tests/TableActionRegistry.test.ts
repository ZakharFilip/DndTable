import { describe, expect, it } from "vitest";
import { TableActionRegistry } from "@dnd-table/shared";

describe("TableActionRegistry", () => {
  it("maps create to CreateObject", () => {
    const r = TableActionRegistry.permissionForPatchOp({
      action: "create",
      key: "k1",
    });
    expect(r.permission).toBe("CreateObject");
    expect(r.objectKey).toBe("k1");
  });

  it("maps position update to ModifyTransform", () => {
    const r = TableActionRegistry.permissionForPatchOp({
      action: "update",
      key: "k1",
      patch: { x: 1 },
    });
    expect(r.permission).toBe("ModifyTransform");
  });

  it("maps props-only update to ChangeObjectProperties", () => {
    const r = TableActionRegistry.permissionForPatchOp({
      action: "update",
      key: "k1",
      patch: { props: { appearance: { fillColor: "#fff" } } },
    });
    expect(r.permission).toBe("ChangeObjectProperties");
  });
});
