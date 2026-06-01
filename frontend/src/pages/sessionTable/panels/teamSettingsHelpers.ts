import type { AccessSnapshot } from "@dnd-table/shared";

export function teamNameById(access: AccessSnapshot, teamId: string): string {
  return access.teams.find((t) => t.id === teamId)?.name ?? teamId;
}

export function formatPlayerTeams(access: AccessSnapshot, teamIds: string[]): string {
  if (teamIds.length === 0) return "—";
  return teamIds.map((id) => teamNameById(access, id)).join(", ");
}

export function playerLabel(p: { userId: string; username?: string }): string {
  return p.username?.trim() || `Игрок ${p.userId.slice(-6)}`;
}

export function sortedParticipants(access: AccessSnapshot) {
  return [...access.participants].sort((a, b) =>
    playerLabel(a).localeCompare(playerLabel(b), "ru")
  );
}
