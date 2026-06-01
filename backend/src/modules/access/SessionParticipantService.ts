import mongoose from "mongoose";
import { HttpError } from "../../shared/HttpError.js";
import { GameSessionModel } from "../gamesessions/game-session.model.js";
import { SessionParticipantModel } from "./models/session-participant.model.js";
import { SessionAccessConfigModel } from "./models/session-access-config.model.js";
import { TeamUserMemberModel } from "./models/team-user-member.model.js";
import { TeamModel } from "./models/team.model.js";
import { AccessSnapshotService } from "./AccessSnapshotService.js";
import type { AccessSnapshot, ViewerContext } from "@dnd-table/shared";
import { TEAM_SLUG_SESSION_OWNER } from "@dnd-table/shared";

export class SessionParticipantService {
  static async isParticipant(gameSessionId: string, userId: string): Promise<boolean> {
    const sessionOid = new mongoose.Types.ObjectId(gameSessionId);
    const userOid = new mongoose.Types.ObjectId(userId);
    const p = await SessionParticipantModel.findOne({
      gameSessionId: sessionOid,
      userId: userOid,
    }).lean();
    return Boolean(p);
  }

  static async assertCanAccessSession(gameSessionId: string, userId: string) {
    const session = await GameSessionModel.findById(gameSessionId).lean();
    if (!session) {
      throw new HttpError(404, "NOT_FOUND", "Сессия не найдена");
    }
    const isOwner = String(session.createdBy) === userId;
    if (isOwner) return session;
    if (session.isPrivate) {
      const ok = await SessionParticipantService.isParticipant(gameSessionId, userId);
      if (!ok) {
        throw new HttpError(403, "FORBIDDEN", "Нет доступа к приватной сессии");
      }
    }
    return session;
  }

  /**
   * Join session: upsert participant, assign default team if user has no teams in session.
   */
  static async join(
    gameSessionId: string,
    userId: string
  ): Promise<{ access: AccessSnapshot; viewer: ViewerContext }> {
    const session = await GameSessionModel.findById(gameSessionId).lean();
    if (!session) {
      throw new HttpError(404, "NOT_FOUND", "Сессия не найдена");
    }
    if (session.isPrivate && String(session.createdBy) !== userId) {
      const already = await SessionParticipantService.isParticipant(gameSessionId, userId);
      if (!already) {
        throw new HttpError(403, "FORBIDDEN", "Нельзя войти в приватную сессию без приглашения");
      }
    }

    const sessionOid = new mongoose.Types.ObjectId(gameSessionId);
    const userOid = new mongoose.Types.ObjectId(userId);

    await SessionParticipantModel.updateOne(
      { gameSessionId: sessionOid, userId: userOid },
      { $setOnInsert: { joinedAt: new Date() } },
      { upsert: true }
    );

    const config = (await SessionAccessConfigModel.findOne({
      gameSessionId: sessionOid,
    }).lean()) as {
      defaultTeamId?: mongoose.Types.ObjectId | null;
    } | null;
    if (!config) {
      throw new HttpError(500, "ACCESS_NOT_INITIALIZED", "ACL сессии не инициализирован");
    }

    const sessionTeams = (await TeamModel.find({ gameSessionId: sessionOid }).lean()) as Array<{
      _id: mongoose.Types.ObjectId;
      slug?: string | null;
    }>;
    const teamIds = sessionTeams.map((t) => t._id);
    const existingMemberships = await TeamUserMemberModel.find({
      teamId: { $in: teamIds },
      userId: userOid,
    }).lean();

    if (existingMemberships.length === 0) {
      const isOwner = String(session.createdBy) === userId;
      let targetTeamId: mongoose.Types.ObjectId | null | undefined =
        config.defaultTeamId ?? null;
      if (isOwner) {
        const ownerTeam = sessionTeams.find((t) => t.slug === TEAM_SLUG_SESSION_OWNER);
        if (ownerTeam) targetTeamId = ownerTeam._id;
      }
      if (targetTeamId) {
        await TeamUserMemberModel.create({ teamId: targetTeamId, userId: userOid });
      }
    }

    const access = await AccessSnapshotService.load(gameSessionId);
    if (!access) {
      throw new HttpError(500, "ACCESS_NOT_INITIALIZED", "ACL сессии не инициализирован");
    }

    const participant = access.participants.find((p) => p.userId === userId);
    const viewer: ViewerContext = {
      userId,
      teamIds: participant?.teamIds ?? [],
    };

    return { access, viewer };
  }

  static async getViewerContext(
    gameSessionId: string,
    userId: string
  ): Promise<ViewerContext | null> {
    const access = await AccessSnapshotService.load(gameSessionId);
    if (!access) return null;
    const participant = access.participants.find((p) => p.userId === userId);
    if (!participant) return { userId, teamIds: [] };
    return { userId, teamIds: participant.teamIds };
  }
}
