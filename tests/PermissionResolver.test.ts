import { describe, expect, it, beforeEach } from "vitest";
import { PermissionResolver } from "@dnd-table/shared";
import { buildSnapshot, grant, localGrant, teamId } from "./access/testHelpers.js";

describe("PermissionResolver", () => {
  beforeEach(() => {
    // reset team id counter by re-importing pattern — ids are unique per test file run
  });

  it("session owner user always has permission", () => {
    const players = teamId("players");
    const snap = buildSnapshot({
      ownerUserId: "owner-1",
      teams: [
        { id: players, name: "Players", parentTeamId: null },
      ],
      participants: [{ userId: "owner-1", teamIds: [] }],
      globalGrants: [grant(players, "ModifyTransform", "Deny")],
    });
    const r = new PermissionResolver(snap);
    expect(r.hasPermission("owner-1", "ModifyTransform")).toBe(true);
  });

  it("Players Allow Move, TeamC Deny — user in TeamC cannot move", () => {
    const players = teamId("players");
    const teamC = teamId("teamC");
    const snap = buildSnapshot({
      teams: [
        { id: players, name: "Players", parentTeamId: null },
        { id: teamC, name: "TeamC", parentTeamId: players },
      ],
      participants: [{ userId: "u-c", teamIds: [teamC] }],
      globalGrants: [
        grant(players, "ModifyTransform", "Allow"),
        grant(teamC, "ModifyTransform", "Deny"),
      ],
    });
    const r = new PermissionResolver(snap);
    expect(r.hasPermission("u-c", "ModifyTransform")).toBe(false);
  });

  it("TeamA inherits Players Allow; sibling TeamC Deny does not apply", () => {
    const players = teamId("players");
    const teamA = teamId("teamA");
    const teamC = teamId("teamC");
    const snap = buildSnapshot({
      teams: [
        { id: players, name: "Players", parentTeamId: null },
        { id: teamA, name: "TeamA", parentTeamId: players },
        { id: teamC, name: "TeamC", parentTeamId: players },
      ],
      participants: [{ userId: "u-a", teamIds: [teamA] }],
      globalGrants: [
        grant(players, "ModifyTransform", "Allow"),
        grant(teamC, "ModifyTransform", "Deny"),
      ],
    });
    const r = new PermissionResolver(snap);
    expect(r.hasPermission("u-a", "ModifyTransform")).toBe(true);
  });

  it("deeper team Deny overrides parent Allow (Players Allow, TeamA Allow, Squad1 Deny)", () => {
    const players = teamId("players");
    const teamA = teamId("teamA");
    const squad1 = teamId("squad1");
    const snap = buildSnapshot({
      teams: [
        { id: players, name: "Players", parentTeamId: null },
        { id: teamA, name: "TeamA", parentTeamId: players },
        { id: squad1, name: "Squad1", parentTeamId: teamA },
      ],
      participants: [{ userId: "u-s", teamIds: [squad1] }],
      globalGrants: [
        grant(players, "ModifyTransform", "Deny"),
        grant(teamA, "ModifyTransform", "Allow"),
        grant(squad1, "ModifyTransform", "Deny"),
      ],
    });
    const r = new PermissionResolver(snap);
    expect(r.hasPermission("u-s", "ModifyTransform")).toBe(false);
  });

  it("local Deny on object overrides global Allow for that object", () => {
    const players = teamId("players");
    const teamA = teamId("teamA");
    const snap = buildSnapshot({
      teams: [
        { id: players, name: "Players", parentTeamId: null },
        { id: teamA, name: "TeamA", parentTeamId: players },
      ],
      participants: [{ userId: "u-a", teamIds: [teamA] }],
      globalGrants: [grant(players, "ModifyTransform", "Allow")],
      objectPermissionGrants: [
        localGrant("obj-x", teamA, "ModifyTransform", "Deny"),
      ],
    });
    const r = new PermissionResolver(snap);
    expect(r.hasPermission("u-a", "ModifyTransform", "obj-x")).toBe(false);
    expect(r.hasPermission("u-a", "ModifyTransform", "obj-other")).toBe(true);
  });

  it("local Allow on object overrides global Deny for that object", () => {
    const players = teamId("players");
    const teamC = teamId("teamC");
    const snap = buildSnapshot({
      teams: [
        { id: players, name: "Players", parentTeamId: null },
        { id: teamC, name: "TeamC", parentTeamId: players },
      ],
      participants: [{ userId: "u-c", teamIds: [teamC] }],
      globalGrants: [grant(teamC, "ModifyTransform", "Deny")],
      objectPermissionGrants: [
        localGrant("obj-x", teamC, "ModifyTransform", "Allow"),
      ],
    });
    const r = new PermissionResolver(snap);
    expect(r.hasPermission("u-c", "ModifyTransform", "obj-x")).toBe(true);
    expect(r.hasPermission("u-c", "ModifyTransform", "obj-y")).toBe(false);
  });

  it("default deny when no grants match", () => {
    const snap = buildSnapshot({
      teams: [{ id: "t1", name: "Lonely", parentTeamId: null }],
      participants: [{ userId: "u1", teamIds: ["t1"] }],
    });
    const r = new PermissionResolver(snap);
    expect(r.hasPermission("u1", "CreateObject")).toBe(false);
  });
});
