import type { Server, Socket } from 'socket.io';

type JoinPayload = { partyId: string; sceneId?: string };

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
}

function roomParty(partyId: string) {
  return `party:${partyId}`;
}

function roomScene(partyId: string, sceneId: string) {
  return `scene:${partyId}:${sceneId}`;
}


