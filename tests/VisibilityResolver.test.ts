import { describe, expect, it } from "vitest";
import { VisibilityResolver } from "@dnd-table/shared";
import { buildSnapshot, teamId } from "./access/testHelpers.js";

describe("VisibilityResolver", () => {
  it("default visible when no grants", () => {
    const snap = buildSnapshot({
      teams: [{ id: "t1", name: "T", parentTeamId: null }],
      participants: [{ userId: "u1", teamIds: ["t1"] }],
    });
    const r = new VisibilityResolver(snap);
    expect(r.isVisible("u1", "obj-1")).toBe(true);
  });

  it("Hidden for team hides object from that team member", () => {
    const teamA = teamId("a");
    const teamB = teamId("b");
    const snap = buildSnapshot({
      teams: [
        { id: teamA, name: "A", parentTeamId: null },
        { id: teamB, name: "B", parentTeamId: null },
      ],
      participants: [
        { userId: "u-a", teamIds: [teamA] },
        { userId: "u-b", teamIds: [teamB] },
      ],
      objectVisibilityGrants: [
        { objectKey: "obj-x", teamId: teamA, value: "Hidden" },
      ],
    });
    const r = new VisibilityResolver(snap);
    expect(r.isVisible("u-a", "obj-x")).toBe(false);
    expect(r.isVisible("u-b", "obj-x")).toBe(true);
  });

  it("Visible grant for one team does not hide others", () => {
    const teamA = teamId("a");
    const snap = buildSnapshot({
      teams: [{ id: teamA, name: "A", parentTeamId: null }],
      participants: [{ userId: "u-a", teamIds: [teamA] }],
      objectVisibilityGrants: [
        { objectKey: "obj-x", teamId: teamA, value: "Visible" },
      ],
    });
    const r = new VisibilityResolver(snap);
    expect(r.isVisible("u-a", "obj-x")).toBe(true);
  });
});
