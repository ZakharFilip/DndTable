import mongoose from "mongoose";
import { TEAM_SLUG_SESSION_OWNER, TEAM_SLUG_VISITORS } from "@dnd-table/shared";
import { TeamModel } from "./models/team.model.js";
import { TeamUserMemberModel } from "./models/team-user-member.model.js";
import { SessionParticipantModel } from "./models/session-participant.model.js";
import { SessionAccessConfigModel } from "./models/session-access-config.model.js";

/**
 * Seeds system teams and owner membership for a new game session.
 */
export class AccessBootstrap {
  static async seedForSession(gameSessionId: string, ownerUserId: string) {
    const sessionOid = new mongoose.Types.ObjectId(gameSessionId);
    const ownerOid = new mongoose.Types.ObjectId(ownerUserId);

    const ownerTeam = await TeamModel.create({
      gameSessionId: sessionOid,
      name: "Session Owner",
      slug: TEAM_SLUG_SESSION_OWNER,
      isSystem: true,
      isDefaultForNewUsers: false,
    });

    const visitorsTeam = await TeamModel.create({
      gameSessionId: sessionOid,
      name: "Visitors",
      slug: TEAM_SLUG_VISITORS,
      isSystem: true,
      isDefaultForNewUsers: true,
    });

    await SessionAccessConfigModel.create({
      gameSessionId: sessionOid,
      defaultTeamId: visitorsTeam._id,
      sessionOwnerUserId: ownerOid,
    });

    await TeamUserMemberModel.create({ teamId: ownerTeam._id, userId: ownerOid });

    await SessionParticipantModel.create({
      gameSessionId: sessionOid,
      userId: ownerOid,
      joinedAt: new Date(),
    });

    return {
      ownerTeamId: String(ownerTeam._id),
      visitorsTeamId: String(visitorsTeam._id),
    };
  }
}
