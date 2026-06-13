import mongoose from "mongoose";
import { TeamModel } from "../access/models/team.model.js";
import { TeamUserMemberModel } from "../access/models/team-user-member.model.js";
import { SessionAccessConfigModel } from "../access/models/session-access-config.model.js";
import { GlobalPermissionGrantModel } from "../access/models/global-permission-grant.model.js";
import { ObjectPermissionGrantModel } from "../access/models/object-permission-grant.model.js";
import { ObjectVisibilityGrantModel } from "../access/models/object-visibility-grant.model.js";
import { SessionParticipantModel } from "../access/models/session-participant.model.js";
import { TableObjectModel } from "./table-object.model.js";
import { SessionStateModel } from "./session-state.model.js";
import { SessionInviteModel } from "./session-invites/session-invite.model.js";
import { GameSessionModel } from "./game-session.model.js";

/** Deletes a game session and all ACL/table data. */
export async function cascadeDeleteSession(sessionId: string): Promise<void> {
  const sessionOid = new mongoose.Types.ObjectId(sessionId);
  const teams = await TeamModel.find({ gameSessionId: sessionOid }).select({ _id: 1 }).lean();
  const teamIds = teams.map((t) => t._id);

  await TeamUserMemberModel.deleteMany({ teamId: { $in: teamIds } });
  await GlobalPermissionGrantModel.deleteMany({ gameSessionId: sessionOid });
  await ObjectPermissionGrantModel.deleteMany({ gameSessionId: sessionOid });
  await ObjectVisibilityGrantModel.deleteMany({ gameSessionId: sessionOid });
  await SessionParticipantModel.deleteMany({ gameSessionId: sessionOid });
  await SessionAccessConfigModel.deleteMany({ gameSessionId: sessionOid });
  await TeamModel.deleteMany({ gameSessionId: sessionOid });
  await TableObjectModel.deleteMany({ gameSessionId: sessionOid });
  await SessionStateModel.deleteMany({ gameSessionId: sessionOid });
  await SessionInviteModel.deleteMany({ gameSessionId: sessionOid });
  await GameSessionModel.deleteOne({ _id: sessionOid });
}
