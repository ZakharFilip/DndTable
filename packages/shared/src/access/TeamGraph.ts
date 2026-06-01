import type { TeamDto } from "./AccessSnapshot.js";

/**
 * Team hierarchy (single parent per team in MVP).
 * Membership (users in teams) is separate from inheritance links.
 */
export class TeamGraph {
  private readonly byId = new Map<string, TeamDto>();

  constructor(teams: TeamDto[]) {
    for (const t of teams) {
      this.byId.set(t.id, t);
    }
  }

  get(teamId: string): TeamDto | undefined {
    return this.byId.get(teamId);
  }

  /** Root → leaf order (parents first). */
  getAncestors(teamId: string): string[] {
    const out: string[] = [];
    let current = this.byId.get(teamId)?.parentTeamId ?? null;
    const seen = new Set<string>();
    while (current) {
      if (seen.has(current)) break;
      seen.add(current);
      out.push(current);
      current = this.byId.get(current)?.parentTeamId ?? null;
    }
    return out;
  }

  /** Depth from root: root teams = 0, child = parentDepth + 1. */
  getDepth(teamId: string): number {
    return this.getAncestors(teamId).length;
  }

  /** True if adding parentTeamId as parent of childTeamId would create a cycle. */
  wouldCreateCycle(childTeamId: string, parentTeamId: string): boolean {
    if (childTeamId === parentTeamId) return true;
    const walk = new Set<string>();
    let current: string | null | undefined = parentTeamId;
    while (current) {
      if (current === childTeamId) return true;
      if (walk.has(current)) return true;
      walk.add(current);
      current = this.byId.get(current)?.parentTeamId ?? null;
    }
    return false;
  }
}
