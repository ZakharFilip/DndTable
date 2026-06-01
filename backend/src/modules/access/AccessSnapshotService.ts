import mongoose from "mongoose";
import type { AccessSnapshot, Permission, TeamDto } from "@dnd-table/shared";
import { TeamModel } from "./models/team.model.js";
import { TeamUserMemberModel } from "./models/team-user-member.model.js";
import { SessionParticipantModel } from "./models/session-participant.model.js";
import { SessionAccessConfigModel } from "./models/session-access-config.model.js";
import { GlobalPermissionGrantModel } from "./models/global-permission-grant.model.js";
import { ObjectPermissionGrantModel } from "./models/object-permission-grant.model.js";
import { ObjectVisibilityGrantModel } from "./models/object-visibility-grant.model.js";
import { UserModel } from "../users/user.model.js";

export class AccessSnapshotService {
  static async load(gameSessionId: string): Promise<AccessSnapshot | null> {
    const sessionOid = new mongoose.Types.ObjectId(gameSessionId);
    const config = (await SessionAccessConfigModel.findOne({
      gameSessionId: sessionOid,
    }).lean()) as {
      defaultTeamId?: mongoose.Types.ObjectId | null;
      sessionOwnerUserId: mongoose.Types.ObjectId;
    } | null;
    if (!config) return null;

    const teams = await TeamModel.find({ gameSessionId: sessionOid }).lean();
    const teamIds = teams.map((t) => t._id);

    const [members, participants, globalGrants, objectPermGrants, objectVisGrants] =
      await Promise.all([
        TeamUserMemberModel.find({ teamId: { $in: teamIds } }).lean(),
        SessionParticipantModel.find({ gameSessionId: sessionOid }).lean(),
        GlobalPermissionGrantModel.find({ gameSessionId: sessionOid }).lean(),
        ObjectPermissionGrantModel.find({ gameSessionId: sessionOid }).lean(),
        ObjectVisibilityGrantModel.find({ gameSessionId: sessionOid }).lean(),
      ]);

    const teamIdsByUser = new Map<string, string[]>();
    for (const m of members) {
      const uid = String(m.userId);
      const list = teamIdsByUser.get(uid) ?? [];
      list.push(String(m.teamId));
      teamIdsByUser.set(uid, list);
    }

    const joinedAtByUser = new Map<string, string | undefined>();
    for (const p of participants) {
      const uid = String(p.userId);
      if (!teamIdsByUser.has(uid)) {
        teamIdsByUser.set(uid, []);
      }
      joinedAtByUser.set(uid, p.joinedAt?.toISOString());
    }

    const allUserIds = new Set<string>(teamIdsByUser.keys());
    for (const m of members) {
      allUserIds.add(String(m.userId));
    }

    const users = await UserModel.find({ _id: { $in: [...allUserIds] } })
      .select({ username: 1, email: 1 })
      .lean();
    const userById = new Map(
      users.map((u) => [String(u._id), { username: u.username, email: u.email }])
    );

    const teamDtos: TeamDto[] = teams.map((t) => ({
      id: String(t._id),
      gameSessionId: String(t.gameSessionId),
      name: t.name,
      slug: t.slug ?? undefined,
      isSystem: Boolean(t.isSystem),
      isDefaultForNewUsers: Boolean(t.isDefaultForNewUsers),
      parentTeamId: t.parentTeamId ? String(t.parentTeamId) : null,
    }));

    return {
      config: {
        gameSessionId,
        defaultTeamId: config.defaultTeamId ? String(config.defaultTeamId) : null,
        sessionOwnerUserId: String(config.sessionOwnerUserId),
      },
      teams: teamDtos,
      participants: [...allUserIds]
        .map((userId) => {
          const profile = userById.get(userId);
          return {
            userId,
            username: profile?.username,
            email: profile?.email,
            teamIds: teamIdsByUser.get(userId) ?? [],
            joinedAt: joinedAtByUser.get(userId),
          };
        })
        .sort((a, b) =>
          (a.username ?? a.userId).localeCompare(b.username ?? b.userId, "ru")
        ),
      globalGrants: globalGrants.map((g) => ({
        teamId: String(g.teamId),
        permission: g.permission as Permission,
        value: g.value as "Allow" | "Deny",
        context: (g.context as "Default") ?? "Default",
      })),
      objectPermissionGrants: objectPermGrants.map((g) => ({
        objectKey: g.objectKey,
        teamId: String(g.teamId),
        permission: g.permission as Permission,
        value: g.value as "Allow" | "Deny",
      })),
      objectVisibilityGrants: objectVisGrants.map((g) => ({
        objectKey: g.objectKey,
        teamId: String(g.teamId),
        value: g.value as "Visible" | "Hidden",
      })),
    };
  }
}
