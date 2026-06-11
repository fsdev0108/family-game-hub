const { getRoom, getPlayer } = require('../utils/roomManager');

function createSocketAuthMiddleware(sessionMiddleware) {
  return function socketAuth(socket, next) {
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