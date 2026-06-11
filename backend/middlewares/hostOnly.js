const { createError } = require('./errorHandler');
const { getRoom } = require('../utils/roomManager');

function hostOnly(req, res, next) {
  const { code } = req.params;
  const room = getRoom(code);

  if (!room) {
    return next(createError(404, 'ROOM_NOT_FOUND', 'Room not found'));
  }
  if (room.hostId !== req.session.playerId) {
    return next(createError(403, 'FORBIDDEN', 'Only the host can perform this action'));
  }
  next();
}

module.exports = hostOnly;