import type { Server, Socket } from 'socket.io';
import mongoose from "mongoose";
import { applyTablePatches, type TablePatchOp } from "../gamesessions/table-patch.js";

type JoinPayload = { partyId: string; sceneId?: string };
type JoinTablePayload = { tableId: string };
type TablePatchPayload = { tableId: string; clientId: string; ops: TablePatchOp[] };

export function registerRealtime(io: Server) {
  io.on('connection', (socket: Socket) => {
    wireSocket(io, socket);
  });
}

function wireSocket(io: Server, socket: Socket) {
  socket.on('joinParty', ({ partyId }: JoinPayload) => {
    if (!partyId) return;
    socket.join(roomParty(partyId));
    socket.emit('joinedParty', { partyId });
  });

  socket.on('joinScene', ({ partyId, sceneId }: JoinPayload) => {
    if (!partyId || !sceneId) return;
    socket.join(roomScene(partyId, sceneId));
    socket.emit('joinedScene', { partyId, sceneId });
  });

  socket.on('applyOperation', (payload: any) => {
    // TODO: validate op, check ACL, apply on server state (MVP stub)
    const { partyId, sceneId } = payload || {};
    if (partyId && sceneId) {
      io.to(roomScene(partyId, sceneId)).emit('opApplied', payload);
    }
  });

  // Table sessions (game sessions)
  socket.on("joinTable", ({ tableId }: JoinTablePayload) => {
    if (!tableId || !mongoose.Types.ObjectId.isValid(tableId)) return;
    socket.join(roomTable(tableId));
    socket.emit("joinedTable", { tableId });
  });

  socket.on("table:patch", async (payload: TablePatchPayload, ack?: (resp: any) => void) => {
    try {
      const { tableId, clientId, ops } = payload || ({} as any);
      if (!tableId || !mongoose.Types.ObjectId.isValid(tableId) || !Array.isArray(ops)) {
        ack?.({ success: false, error: "BAD_REQUEST" });
        return;
      }

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
    } catch (e) {
      ack?.({ success: false, error: "INTERNAL_SERVER_ERROR" });
    }
  });
}

function roomParty(partyId: string) {
  return `party:${partyId}`;
}

function roomScene(partyId: string, sceneId: string) {
  return `scene:${partyId}:${sceneId}`;
}

function roomTable(tableId: string) {
  return `table:${tableId}`;
}


