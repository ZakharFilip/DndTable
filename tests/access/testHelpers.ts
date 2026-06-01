import type { AccessSnapshot, Permission, TeamDto } from "@dnd-table/shared";

let teamCounter = 0;
export function teamId(name: string) {
  return `team-${name}-${++teamCounter}`;
}

export function buildSnapshot(params: {
  ownerUserId?: string;
  teams: Array<Omit<TeamDto, "gameSessionId"> & { gameSessionId?: string }>;
  participants: Array<{ userId: string; teamIds: string[] }>;
  globalGrants?: AccessSnapshot["globalGrants"];
  objectPermissionGrants?: AccessSnapshot["objectPermissionGrants"];
  objectVisibilityGrants?: AccessSnapshot["objectVisibilityGrants"];
}): AccessSnapshot {
  const gameSessionId = "session-1";
  return {
    config: {
      gameSessionId,
      defaultTeamId: null,
      sessionOwnerUserId: params.ownerUserId ?? "owner-1",
    },
    teams: params.teams.map((t) => ({
      gameSessionId,
      ...t,
    })),
    participants: params.participants,
    globalGrants: params.globalGrants ?? [],
    objectPermissionGrants: params.objectPermissionGrants ?? [],
    objectVisibilityGrants: params.objectVisibilityGrants ?? [],
  };
}

export function grant(
  teamId: string,
  permission: Permission,
  value: "Allow" | "Deny"
): AccessSnapshot["globalGrants"][0] {
  return { teamId, permission, value };
}

export function localGrant(
  objectKey: string,
  teamId: string,
  permission: Permission,
  value: "Allow" | "Deny"
): AccessSnapshot["objectPermissionGrants"][0] {
  return { objectKey, teamId, permission, value };
}
