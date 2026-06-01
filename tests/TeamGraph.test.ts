import { describe, expect, it } from "vitest";
import { TeamGraph } from "@dnd-table/shared";

describe("TeamGraph", () => {
  it("detects cycle when linking child under its descendant", () => {
    const graph = new TeamGraph([
      { id: "a", gameSessionId: "s", name: "A", parentTeamId: null },
      { id: "b", gameSessionId: "s", name: "B", parentTeamId: "a" },
      { id: "c", gameSessionId: "s", name: "C", parentTeamId: "b" },
    ]);
    expect(graph.wouldCreateCycle("a", "c")).toBe(true);
    expect(graph.wouldCreateCycle("c", "a")).toBe(false);
  });

  it("getAncestors returns parent chain", () => {
    const graph = new TeamGraph([
      { id: "p", gameSessionId: "s", name: "P", parentTeamId: null },
      { id: "c", gameSessionId: "s", name: "C", parentTeamId: "p" },
    ]);
    expect(graph.getAncestors("c")).toEqual(["p"]);
    expect(graph.getDepth("c")).toBe(1);
  });
});
