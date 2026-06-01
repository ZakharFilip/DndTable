import type { AccessSnapshot } from "./AccessSnapshot.js";
import type { Permission, PermissionContext, StoredPermissionValue } from "./types.js";
import { TEAM_SLUG_SESSION_OWNER } from "./types.js";
import { TeamGraph } from "./TeamGraph.js";

/**
 * Computes effective permission using the priority order from the product spec:
 * 1–2 local child, 3–4 local parent, 5–6 global child, 7–8 global parent, 9 default deny.
 * Deny beats Allow at the same stage; deeper user teams are checked first within each stage.
 */
export class PermissionResolver {
  private readonly graph: TeamGraph;
  private readonly globalMap: Map<string, StoredPermissionValue>;
  private readonly localMap: Map<string, StoredPermissionValue>;
  private readonly ownerTeamIds: Set<string>;
  private readonly userTeamIds: Map<string, string[]>;

  constructor(
    private readonly snapshot: AccessSnapshot,
    private readonly context: PermissionContext = "Default"
  ) {
    this.graph = new TeamGraph(snapshot.teams);
    this.globalMap = new Map();
    for (const g of snapshot.globalGrants) {
      if (g.context && g.context !== context) continue;
      this.globalMap.set(this.grantKey(g.teamId, g.permission), g.value);
    }
    this.localMap = new Map();
    for (const g of snapshot.objectPermissionGrants) {
      this.localMap.set(
        this.localKey(g.objectKey, g.teamId, g.permission),
        g.value
      );
    }
    this.ownerTeamIds = new Set(
      snapshot.teams.filter((t) => t.slug === TEAM_SLUG_SESSION_OWNER).map((t) => t.id)
    );
    this.userTeamIds = new Map(
      snapshot.participants.map((p) => [p.userId, p.teamIds])
    );
  }

  hasPermission(userId: string, permission: Permission, objectKey?: string): boolean {
    const directTeams = this.userTeamIds.get(userId) ?? [];
    if (directTeams.some((id) => this.ownerTeamIds.has(id))) {
      return true;
    }
    if (userId === this.snapshot.config.sessionOwnerUserId) {
      return true;
    }

    const teamsByDepth = [...directTeams].sort(
      (a, b) => this.graph.getDepth(b) - this.graph.getDepth(a)
    );
    if (teamsByDepth.length === 0) return false;

    if (objectKey) {
      if (this.scanLocal(teamsByDepth, objectKey, permission, "Deny", "child")) return false;
      if (this.scanLocal(teamsByDepth, objectKey, permission, "Allow", "child")) return true;
      if (this.scanLocal(teamsByDepth, objectKey, permission, "Deny", "parent")) return false;
      if (this.scanLocal(teamsByDepth, objectKey, permission, "Allow", "parent")) return true;
    }

    if (this.scanGlobal(teamsByDepth, permission, "Deny", "child")) return false;
    if (this.scanGlobal(teamsByDepth, permission, "Allow", "child")) return true;
    if (this.scanGlobal(teamsByDepth, permission, "Deny", "parent")) return false;
    if (this.scanGlobal(teamsByDepth, permission, "Allow", "parent")) return true;

    return false;
  }

  getUserTeamIds(userId: string): string[] {
    return [...(this.userTeamIds.get(userId) ?? [])];
  }

  private scanLocal(
    teamsByDepth: string[],
    objectKey: string,
    permission: Permission,
    value: StoredPermissionValue,
    scope: "child" | "parent"
  ): boolean {
    for (const teamId of teamsByDepth) {
      const chain = scope === "child" ? [teamId] : this.graph.getAncestors(teamId);
      for (const tid of chain) {
        if (this.getLocal(objectKey, tid, permission) === value) return true;
      }
    }
    return false;
  }

  private scanGlobal(
    teamsByDepth: string[],
    permission: Permission,
    value: StoredPermissionValue,
    scope: "child" | "parent"
  ): boolean {
    for (const teamId of teamsByDepth) {
      const chain = scope === "child" ? [teamId] : this.graph.getAncestors(teamId);
      for (const tid of chain) {
        if (this.getGlobal(tid, permission) === value) return true;
      }
    }
    return false;
  }

  private getGlobal(teamId: string, permission: Permission): StoredPermissionValue | undefined {
    return this.globalMap.get(this.grantKey(teamId, permission));
  }

  private getLocal(
    objectKey: string,
    teamId: string,
    permission: Permission
  ): StoredPermissionValue | undefined {
    return this.localMap.get(this.localKey(objectKey, teamId, permission));
  }

  private grantKey(teamId: string, permission: Permission): string {
    return `${teamId}:${permission}`;
  }

  private localKey(objectKey: string, teamId: string, permission: Permission): string {
    return `${objectKey}:${teamId}:${permission}`;
  }
}
