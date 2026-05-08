import type { Server, Socket } from 'socket.io';
import mongoose from "mongoose";
import type { TablePatchOp } from "@dnd-table/shared";
import { applyTablePatches } from "../gamesessions/table-patch.js";

type JoinPayload = { partyId: string; sceneId?: string };
type JoinTablePayload = { tableId: string };
type TablePatchPayload = { tableId: string; clientId: string; ops: TablePatchOp[] };
type Ack = (resp: unknown) => void;

const roomParty = (partyId: string) => `party:${partyId}`;
const roomScene = (partyId: string, sceneId: string) => `scene:${partyId}:${sceneId}`;
const roomTable = (tableId: string) => `table:${tableId}`;

function handleJoinParty(socket: Socket, { partyId }: JoinPayload) {
  if (!partyId) return;
  socket.join(roomParty(partyId));
  socket.emit('joinedParty', { partyId });
}

function handleJoinScene(socket: Socket, { partyId, sceneId }: JoinPayload) {
  if (!partyId || !sceneId) return;
  socket.join(roomScene(partyId, sceneId));
  socket.emit('joinedScene', { partyId, sceneId });
}

function handleApplyOperation(io: Server, payload: { partyId?: string; sceneId?: string }) {
  // TODO: validate op, check ACL, apply on server state (MVP stub)
  const { partyId, sceneId } = payload || {};
  if (partyId && sceneId) {
    io.to(roomScene(partyId, sceneId)).emit('opApplied', payload);
  }
}

function handleJoinTable(socket: Socket, { tableId }: JoinTablePayload) {
  if (!tableId || !mongoose.Types.ObjectId.isValid(tableId)) return;
  socket.join(roomTable(tableId));
  socket.emit("joinedTable", { tableId });
}

async function handleTablePatch(io: Server, payload: TablePatchPayload, ack?: Ack) {
  try {
    const { tableId, clientId, ops } = payload || ({} as TablePatchPayload);
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
  } catch {
    ack?.({ success: false, error: "INTERNAL_SERVER_ERROR" });
  }
}

export function registerRealtime(io: Server) {
  io.on('connection', (socket: Socket) => {
    socket.on('joinParty', (p: JoinPayload) => handleJoinParty(socket, p));
    socket.on('joinScene', (p: JoinPayload) => handleJoinScene(socket, p));
    socket.on('applyOperation', (p: { partyId?: string; sceneId?: string }) => handleApplyOperation(io, p));
    socket.on('joinTable', (p: JoinTablePayload) => handleJoinTable(socket, p));
    socket.on('table:patch', (p: TablePatchPayload, ack?: Ack) => handleTablePatch(io, p, ack));
  });
}
