import mongoose from "mongoose";
import type { TabletopBaseObject } from "@dnd-table/shared";
import { GameSessionModel } from "./game-session.model";
import { TableObjectModel } from "./table-object.model";
import { SessionStateModel } from "./session-state.model";
import { applyTablePatches, type ApplyPatchResult, type TablePatchOp } from "./table-patch";
import { HttpError } from "../../shared/HttpError";

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

  async getFull(sessionId: string) {
    const session = await findSessionOrThrow(sessionId);

    const [objects, state] = await Promise.all([
      TableObjectModel.find({ gameSessionId: sessionId })
        .sort({ sortOrder: 1, _id: 1 })
        .lean(),
      SessionStateModel.findOne({ gameSessionId: sessionId }).lean(),
    ]);

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
      objects: objects.map((o) => ({
        id: String(o._id),
        key: (o as { key?: string }).key ?? String(o._id),
        type: o.type,
        x: o.x,
        y: o.y,
        sortOrder: o.sortOrder ?? 0,
        props: o.props ?? {},
        version: (o as { version?: number }).version ?? 1,
      })),
    };
  },

  async applyPatch(sessionId: string, ops: TablePatchOp[]): Promise<ApplyPatchResult> {
    await findSessionOrThrow(sessionId);
    return applyTablePatches({ gameSessionId: sessionId, ops });
  },

  async saveState(
    sessionId: string,
    payload: {
      viewport?: { panX?: number; panY?: number; scale?: number };
      objects?: IncomingTableObject[];
    }
  ) {
    await findSessionOrThrow(sessionId);

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
