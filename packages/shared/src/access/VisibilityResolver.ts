import type { AccessSnapshot } from "./AccessSnapshot.js";
import type { StoredVisibilityValue } from "./types.js";
import { TEAM_SLUG_SESSION_OWNER } from "./types.js";
import { TeamGraph } from "./TeamGraph.js";

/**
 * Object visibility per viewer team membership.
 * Default: visible when no rule matches (stage 9).
 */
export class VisibilityResolver {
  private readonly graph: TeamGraph;
  private readonly localMap: Map<string, StoredVisibilityValue>;
  private readonly ownerTeamIds: Set<string>;
  private readonly userTeamIds: Map<string, string[]>;

  constructor(private readonly snapshot: AccessSnapshot) {
    this.graph = new TeamGraph(snapshot.teams);
    this.localMap = new Map();
    for (const g of snapshot.objectVisibilityGrants) {
      this.localMap.set(`${g.objectKey}:${g.teamId}`, g.value);
    }
    this.ownerTeamIds = new Set(
      snapshot.teams.filter((t) => t.slug === TEAM_SLUG_SESSION_OWNER).map((t) => t.id)
    );
    this.userTeamIds = new Map(
      snapshot.participants.map((p) => [p.userId, p.teamIds])
    );
  }

  isVisible(userId: string, objectKey: string): boolean {
    const directTeams = this.userTeamIds.get(userId) ?? [];
    if (directTeams.some((id) => this.ownerTeamIds.has(id))) return true;
    if (userId === this.snapshot.config.sessionOwnerUserId) return true;

    const teamsByDepth = [...directTeams].sort(
      (a, b) => this.graph.getDepth(b) - this.graph.getDepth(a)
    );
    if (teamsByDepth.length === 0) return true;

    if (this.scan(teamsByDepth, objectKey, "Hidden", "child")) return false;
    if (this.scan(teamsByDepth, objectKey, "Visible", "child")) return true;
    if (this.scan(teamsByDepth, objectKey, "Hidden", "parent")) return false;
    if (this.scan(teamsByDepth, objectKey, "Visible", "parent")) return true;

    return true;
  }

  private scan(
    teamsByDepth: string[],
    objectKey: string,
    value: StoredVisibilityValue,
    scope: "child" | "parent"
  ): boolean {
    for (const teamId of teamsByDepth) {
      const chain = scope === "child" ? [teamId] : this.graph.getAncestors(teamId);
      for (const tid of chain) {
        if (this.getGrant(objectKey, tid) === value) return true;
      }
    }
    return false;
  }

  private getGrant(objectKey: string, teamId: string): StoredVisibilityValue | undefined {
    return this.localMap.get(`${objectKey}:${teamId}`);
  }
}
