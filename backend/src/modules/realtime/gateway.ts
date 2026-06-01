import type { RequestHandler } from "express";
import type { Server, Socket } from "socket.io";
import mongoose from "mongoose";
import type { TablePatchOp } from "@dnd-table/shared";
import { applyTablePatches } from "../gamesessions/table-patch.js";
import { socketSessionMiddleware, type SocketWithUser } from "../../shared/socketSession.js";
import { SessionParticipantService } from "../access/SessionParticipantService.js";
import { PatchAuthorization } from "../access/PatchAuthorization.js";
import { HttpError } from "../../shared/HttpError.js";

type JoinPayload = { partyId: string; sceneId?: string };
type JoinTablePayload = { tableId: string };
type TablePatchPayload = { tableId: string; clientId: string; ops: TablePatchOp[] };
type Ack = (resp: unknown) => void;

const roomParty = (partyId: string) => `party:${partyId}`;
const roomScene = (partyId: string, sceneId: string) => `scene:${partyId}:${sceneId}`;
const roomTable = (tableId: string) => `table:${tableId}`;

function getUserId(socket: Socket): string | undefined {
  return (socket as SocketWithUser).data.userId;
}

function handleJoinParty(socket: Socket, { partyId }: JoinPayload) {
  if (!partyId) return;
  socket.join(roomParty(partyId));
  socket.emit("joinedParty", { partyId });
}

function handleJoinScene(socket: Socket, { partyId, sceneId }: JoinPayload) {
  if (!partyId || !sceneId) return;
  socket.join(roomScene(partyId, sceneId));
  socket.emit("joinedScene", { partyId, sceneId });
}

function handleApplyOperation(io: Server, payload: { partyId?: string; sceneId?: string }) {
  const { partyId, sceneId } = payload || {};
  if (partyId && sceneId) {
    io.to(roomScene(partyId, sceneId)).emit("opApplied", payload);
  }
}

async function handleJoinTable(socket: Socket, { tableId }: JoinTablePayload) {
  const userId = getUserId(socket);
  if (!userId || !tableId || !mongoose.Types.ObjectId.isValid(tableId)) return;
  try {
    await SessionParticipantService.assertCanAccessSession(tableId, userId);
    const isParticipant = await SessionParticipantService.isParticipant(tableId, userId);
    if (!isParticipant) {
      await SessionParticipantService.join(tableId, userId);
    }
    socket.join(roomTable(tableId));
    socket.emit("joinedTable", { tableId });
  } catch {
    socket.emit("error", { code: "FORBIDDEN", message: "Нет доступа к сессии" });
  }
}

async function handleTablePatch(io: Server, socket: Socket, payload: TablePatchPayload, ack?: Ack) {
  try {
    const userId = getUserId(socket);
    if (!userId) {
      ack?.({ success: false, error: "UNAUTHORIZED", status: 401 });
      return;
    }
    const { tableId, clientId, ops } = payload || ({} as TablePatchPayload);
    if (!tableId || !mongoose.Types.ObjectId.isValid(tableId) || !Array.isArray(ops)) {
      ack?.({ success: false, error: "BAD_REQUEST" });
      return;
    }

    await SessionParticipantService.assertCanAccessSession(tableId, userId);
    await PatchAuthorization.assertOpsAllowed(tableId, userId, ops);

    const result = await applyTablePatches({ gameSessionId: tableId, ops });
    if (result.conflicts.length > 0) {
      ack?.({ success: false, error: "VERSION_CONFLICT", status: 409, conflicts: result.conflicts });
      return;
    }

    io.to(roomTable(tableId)).emit("table:patchApplied", {
      tableId,
      clientId,
      applied: result.applied,
    });

    ack?.({ success: true, applied: result.applied });
  } catch (err) {
    if (err instanceof HttpError && err.status === 403) {
      ack?.({ success: false, error: "FORBIDDEN", status: 403, message: err.message });
      return;
    }
    ack?.({ success: false, error: "INTERNAL_SERVER_ERROR" });
  }
}

export function registerRealtime(io: Server, sessionMiddleware: RequestHandler) {
  io.use(socketSessionMiddleware(sessionMiddleware));

  io.on("connection", (socket: Socket) => {
    socket.on("joinParty", (p: JoinPayload) => handleJoinParty(socket, p));
    socket.on("joinScene", (p: JoinPayload) => handleJoinScene(socket, p));
    socket.on("applyOperation", (p: { partyId?: string; sceneId?: string }) =>
      handleApplyOperation(io, p)
    );
    socket.on("joinTable", (p: JoinTablePayload) => void handleJoinTable(socket, p));
    socket.on("table:patch", (p: TablePatchPayload, ack?: Ack) =>
      void handleTablePatch(io, socket, p, ack)
    );
  });
}
