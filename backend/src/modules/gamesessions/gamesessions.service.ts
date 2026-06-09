import mongoose from "mongoose";
import type { TabletopBaseObject } from "@dnd-table/shared";
import { GameSessionModel } from "./game-session.model";
import { TableObjectModel } from "./table-object.model";
import { SessionStateModel } from "./session-state.model";
import { applyTablePatches, type ApplyPatchResult, type TablePatchOp } from "./table-patch";
import { HttpError } from "../../shared/HttpError";
import { AccessBootstrap } from "../access/AccessBootstrap.js";
import {
  AccessSnapshotService,
  SessionParticipantService,
} from "../access/index.js";
import {
  PermissionResolver,
  VisibilityResolver,
  type AccessSnapshot,
  type ViewerContext,
} from "@dnd-table/shared";
import { PatchAuthorization } from "../access/PatchAuthorization.js";
import { SessionParticipantModel } from "../access/models/session-participant.model.js";
import { SessionInviteService } from "./session-invites/SessionInviteService.js";
import { SessionInviteModel } from "./session-invites/session-invite.model.js";
import { TeamModel } from "../access/models/team.model.js";
import { TeamUserMemberModel } from "../access/models/team-user-member.model.js";
import { SessionAccessConfigModel } from "../access/models/session-access-config.model.js";
import { GlobalPermissionGrantModel } from "../access/models/global-permission-grant.model.js";
import { ObjectPermissionGrantModel } from "../access/models/object-permission-grant.model.js";
import { ObjectVisibilityGrantModel } from "../access/models/object-visibility-grant.model.js";

export interface IncomingTableObject {
  key?: string;
  version?: number;
  type: string;
  x?: number;
  y?: number;
  sortOrder?: number;
  props?: Record<string, unknown>;
}

interface NormalizedTableObject {
  type: string;
  x: number;
  y: number;
  props: Record<string, unknown>;
}

/**
 * Combines historical formats into a single shape:
 * - Legacy:      { type, x, y, props }
 * - Transitional: { type, props: { tabletop: TabletopBaseObject } }
 * - Tabletop:    { type, props: TabletopBaseObject }
 */
function normalizeIncomingTableObject(o: IncomingTableObject): NormalizedTableObject {
  const props = o.props && typeof o.props === "object" ? o.props : {};

  if ("transform" in props && "type" in props) {
    const tt = props as unknown as TabletopBaseObject;
    return {
      type: String(tt.type),
      x: Number(tt.transform?.position?.x ?? 0),
      y: Number(tt.transform?.position?.y ?? 0),
      props: tt as unknown as Record<string, unknown>,
    };
  }

  if ("tabletop" in props) {
    const tt = (props as { tabletop?: TabletopBaseObject }).tabletop;
    if (tt) {
      return {
        type: String(tt.type ?? o.type),
        x: Number(tt.transform?.position?.x ?? 0),
        y: Number(tt.transform?.position?.y ?? 0),
        props: tt as unknown as Record<string, unknown>,
      };
    }
  }

  return {
    type: String(o.type),
    x: Number(o.x ?? 0),
    y: Number(o.y ?? 0),
    props,
  };
}

async function findSessionOrThrow(sessionId: string) {
  const session = await GameSessionModel.findById(sessionId).lean();
  if (!session) {
    throw new HttpError(404, "NOT_FOUND", "Сессия не найдена");
  }
  return session;
}

export const GameSessionsService = {
  async createSession(userId: string, dto: { name?: string; description?: string; isPrivate?: boolean }) {
    const session = await GameSessionModel.create({
      name: dto.name || "",
      description: dto.description ?? "",
      isPrivate: Boolean(dto.isPrivate),
      createdBy: userId,
    });

    await AccessBootstrap.seedForSession(String(session._id), userId);

    return {
      id: String(session._id),
      name: session.name,
      description: session.description,
      isPrivate: session.isPrivate,
      createdBy: String(session.createdBy),
      createdAt: session.createdAt,
    };
  },

  async listMy(userId: string) {
    const list = await GameSessionModel.find({ createdBy: userId })
      .sort({ createdAt: -1 })
      .lean();
    return list.map((s) => ({
      id: String(s._id),
      name: s.name,
      description: s.description,
      isPrivate: s.isPrivate,
      createdBy: String(s.createdBy),
      createdAt: s.createdAt,
    }));
  },

  async listDiscover(
    userId: string,
    filters: { q?: string; onlyPublic?: boolean; unvisited?: boolean } = {}
  ) {
    const userOid = new mongoose.Types.ObjectId(userId);
    const participantRows = await SessionParticipantModel.find({ userId: userOid })
      .select({ gameSessionId: 1, meta: 1 })
      .lean();

    const acceptedInviteIds = await SessionInviteService.listAcceptedSessionIds(userId);

    const mineIds = new Set<string>();
    for (const p of participantRows) {
      mineIds.add(String(p.gameSessionId));
      const promoted = Boolean(
        p.meta &&
          typeof p.meta === "object" &&
          (p.meta as { promotedFromVisitors?: boolean }).promotedFromVisitors
      );
      if (promoted) mineIds.add(String(p.gameSessionId));
    }
    for (const id of acceptedInviteIds) mineIds.add(id);

    const q = filters.q?.trim();
    const sessionFilter: Record<string, unknown> = {};
    if (q) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      sessionFilter.$or = [
        { name: { $regex: escaped, $options: "i" } },
        { description: { $regex: escaped, $options: "i" } },
      ];
    }

    const allSessions = await GameSessionModel.find(sessionFilter)
      .populate("createdBy", "username")
      .sort({ createdAt: -1 })
      .lean();

    const mapSession = (s: (typeof allSessions)[0], isMine: boolean) => ({
      id: String(s._id),
      name: s.name,
      description: s.description,
      isPrivate: s.isPrivate,
      createdBy:
        typeof s.createdBy === "object" && s.createdBy && "username" in s.createdBy
          ? (s.createdBy as { username: string }).username
          : String(s.createdBy),
      createdAt: (s.createdAt as Date).toISOString(),
      isMine,
    });

    const creatorIdOf = (s: (typeof allSessions)[0]) => {
      const cb = s.createdBy as mongoose.Types.ObjectId | { _id?: mongoose.Types.ObjectId };
      if (cb && typeof cb === "object" && "_id" in cb && cb._id) {
        return String(cb._id);
      }
      return String(cb);
    };

    let sessions = allSessions;
    if (filters.unvisited) {
      sessions = allSessions.filter((s) => creatorIdOf(s) !== userId);
    }

    let mine = sessions.filter((s) => mineIds.has(String(s._id))).map((s) => mapSession(s, true));
    let others = sessions
      .filter((s) => !mineIds.has(String(s._id)))
      .map((s) => mapSession(s, false));

    if (filters.onlyPublic) {
      others = others.filter((s) => !s.isPrivate);
    }

    return { mine, others };
  },

  async deleteSession(sessionId: string, userId: string) {
    const session = await findSessionOrThrow(sessionId);
    if (String(session.createdBy) !== userId) {
      throw new HttpError(403, "FORBIDDEN", "Только создатель может удалить сессию");
    }

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

    return { success: true };
  },

  async listPublic() {
    const list = await GameSessionModel.find({ isPrivate: false })
      .populate("createdBy", "username")
      .sort({ createdAt: -1 })
      .lean();
    return list.map((s) => ({
      id: String(s._id),
      name: s.name,
      description: s.description,
      isPrivate: s.isPrivate,
      createdBy:
        typeof s.createdBy === "object" && s.createdBy && "username" in s.createdBy
          ? (s.createdBy as { username: string }).username
          : String(s.createdBy),
      createdAt: s.createdAt,
    }));
  },

  async getFull(sessionId: string, userId?: string) {
    const session = await findSessionOrThrow(sessionId);

    if (userId) {
      await SessionParticipantService.assertCanAccessSession(sessionId, userId);
      const isParticipant = await SessionParticipantService.isParticipant(sessionId, userId);
      if (!isParticipant && String(session.createdBy) === userId) {
        await SessionParticipantService.join(sessionId, userId);
      } else if (!isParticipant && !session.isPrivate) {
        await SessionParticipantService.join(sessionId, userId);
      }
    }

    const [objects, state, access] = await Promise.all([
      TableObjectModel.find({ gameSessionId: sessionId })
        .sort({ sortOrder: 1, _id: 1 })
        .lean(),
      SessionStateModel.findOne({ gameSessionId: sessionId }).lean(),
      userId ? AccessSnapshotService.load(sessionId) : Promise.resolve(null),
    ]);

    let viewer: ViewerContext | undefined;
    if (userId && access) {
      const p = access.participants.find((x) => x.userId === userId);
      viewer = { userId, teamIds: p?.teamIds ?? [] };
    }

    const mappedObjects = objects.map((o) => ({
      id: String(o._id),
      key: (o as { key?: string }).key ?? String(o._id),
      type: o.type,
      x: o.x,
      y: o.y,
      sortOrder: o.sortOrder ?? 0,
      props: o.props ?? {},
      version: (o as { version?: number }).version ?? 1,
    }));

    let visibleObjects = mappedObjects;
    if (userId && access) {
      const vis = new VisibilityResolver(access);
      visibleObjects = mappedObjects.filter((o) => vis.isVisible(userId, o.key));
    }

    return {
      session: {
        id: String(session._id),
        name: session.name,
        description: session.description,
        isPrivate: session.isPrivate,
        createdBy: String(session.createdBy),
        createdAt: session.createdAt,
      },
      state: state?.viewport ? { viewport: state.viewport } : null,
      objects: visibleObjects,
      ...(access ? { access: access as AccessSnapshot } : {}),
      ...(viewer ? { viewer } : {}),
    };
  },

  async joinSession(sessionId: string, userId: string) {
    return SessionParticipantService.join(sessionId, userId);
  },

  async getAccess(sessionId: string, userId: string) {
    await SessionParticipantService.assertCanAccessSession(sessionId, userId);
    const isParticipant = await SessionParticipantService.isParticipant(sessionId, userId);
    if (!isParticipant) {
      await SessionParticipantService.join(sessionId, userId);
    }
    const access = await AccessSnapshotService.load(sessionId);
    if (!access) {
      throw new HttpError(500, "ACCESS_NOT_INITIALIZED", "ACL сессии не инициализирован");
    }
    const viewer = await SessionParticipantService.getViewerContext(sessionId, userId);
    return { access, viewer: viewer ?? { userId, teamIds: [] } };
  },

  async applyPatch(
    sessionId: string,
    ops: TablePatchOp[],
    userId?: string
  ): Promise<ApplyPatchResult> {
    await findSessionOrThrow(sessionId);
    if (userId) {
      await SessionParticipantService.assertCanAccessSession(sessionId, userId);
      await PatchAuthorization.assertOpsAllowed(sessionId, userId, ops);
    }
    return applyTablePatches({ gameSessionId: sessionId, ops });
  },

  async saveState(
    sessionId: string,
    payload: {
      viewport?: { panX?: number; panY?: number; scale?: number };
      objects?: IncomingTableObject[];
    },
    userId?: string
  ) {
    await findSessionOrThrow(sessionId);
    if (userId) {
      await SessionParticipantService.assertCanAccessSession(sessionId, userId);
      const snapshot = await AccessSnapshotService.load(sessionId);
      if (snapshot) {
        const resolver = new PermissionResolver(snapshot);
        if (!resolver.hasPermission(userId, "ModifyPermissions")) {
          throw new HttpError(403, "FORBIDDEN", "Недостаточно прав для сохранения состояния");
        }
      }
    }

    const sessionOid = new mongoose.Types.ObjectId(sessionId);

    if (payload.viewport !== undefined) {
      await SessionStateModel.updateOne(
        { gameSessionId: sessionOid },
        {
          $set: {
            gameSessionId: sessionOid,
            viewport: {
              panX: payload.viewport.panX ?? 0,
              panY: payload.viewport.panY ?? 0,
              scale: payload.viewport.scale ?? 1,
            },
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );
    }

    const objects = payload.objects ?? [];
    await TableObjectModel.deleteMany({ gameSessionId: sessionOid });
    if (objects.length > 0) {
      await TableObjectModel.insertMany(
        objects.map((o) => {
          const norm = normalizeIncomingTableObject(o);
          return {
            gameSessionId: sessionOid,
            key: o.key ?? new mongoose.Types.ObjectId().toString(),
            version: o.version ?? 1,
            type: norm.type,
            x: norm.x,
            y: norm.y,
            sortOrder: o.sortOrder ?? 0,
            props: norm.props,
          };
        })
      );
    }
  },
};
