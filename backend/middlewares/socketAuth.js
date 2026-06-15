const { getRoom, getPlayer } = require('../utils/roomManager');

function createSocketAuthMiddleware(sessionMiddleware) {
  return function socketAuth(socket, next) {
    // Prefer client-supplied auth data (tab-specific, avoids shared-cookie
    // problem when multiple tabs run in the same browser during local testing).
    const { playerId: authPlayerId, roomCode: authRoomCode } = socket.handshake.auth || {};

    if (authPlayerId && authRoomCode) {
      const room = getRoom(authRoomCode);
      if (!room) return next(new Error('ROOM_NOT_FOUND'));

      const player = getPlayer(authRoomCode, authPlayerId);
      if (!player) return next(new Error('PLAYER_NOT_FOUND'));

      socket.playerId = authPlayerId;
      socket.roomCode = authRoomCode;
      socket.playerName = player.name;
      socket.isHost = room.hostId === authPlayerId;

      console.log(`[${authRoomCode}] socket auth OK: ${player.name} (${authPlayerId}) host=${socket.isHost}`);
      return next();
    }

    // Fall back to session cookie for clients that don't send auth data.
    sessionMiddleware(socket.request, socket.request.res || {}, async (err) => {
      if (err) return next(new Error('SESSION_ERROR'));

      const session = socket.request.session;

      if (!session || !session.playerId || !session.roomCode) {
        return next(new Error('UNAUTHORIZED'));
      }

      const room = getRoom(session.roomCode);
      if (!room) return next(new Error('ROOM_NOT_FOUND'));

      const player = getPlayer(session.roomCode, session.playerId);
      if (!player) return next(new Error('PLAYER_NOT_FOUND'));

      socket.playerId = session.playerId;
      socket.roomCode = session.roomCode;
      socket.playerName = player.name;
      socket.isHost = session.isHost;

      next();
    });
  };
}

module.exports = { createSocketAuthMiddleware };
