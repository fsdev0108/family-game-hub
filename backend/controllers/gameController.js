const { createError } = require('../middlewares/errorHandler');
const {
  getRoom,
  setRoomPhase,
  updateRoomConfig,
  getPlayersArray,
} = require('../utils/roomManager');
const {
  validateWinkMurderConfig,
  validateImposterConfig,
  canStartGame,
} = require('../utils/gameValidators');

function updateConfigHandler(req, res, next) {
  try {
    const code = req.params.code.toUpperCase();
    const room = getRoom(code);
    if (!room) return next(createError(404, 'ROOM_NOT_FOUND', 'Room not found'));

    if (room.phase !== 'lobby') {
      return next(createError(403, 'GAME_IN_PROGRESS', 'Cannot update config after game has started'));
    }

    const config = req.body;
    const players = getPlayersArray(code);

    if (room.gameType === 'wink-murder') {
      const err = validateWinkMurderConfig(config, players.length);
      if (err) return next(createError(400, 'INVALID_CONFIG', err));
    }

    if (room.gameType === 'imposter') {
      const playerIds = players.map(p => p.id);
      const err = validateImposterConfig(config, playerIds);
      if (err) return next(createError(400, 'INVALID_CONFIG', err));
    }

    const updated = updateRoomConfig(code, config);

    res.json({ config: updated.config });
  } catch (err) {
    next(err);
  }
}

function startGameHandler(req, res, next) {
  try {
    const code = req.params.code.toUpperCase();
    const room = getRoom(code);
    if (!room) return next(createError(404, 'ROOM_NOT_FOUND', 'Room not found'));

    if (room.phase !== 'lobby') {
      return next(createError(403, 'ALREADY_STARTED', 'Game has already started'));
    }

    const canStart = canStartGame(room);
    if (canStart) return next(createError(400, 'NOT_ENOUGH_PLAYERS', canStart));

    setRoomPhase(code, 'starting');

    res.json({ message: 'Game starting', gameType: room.gameType, roomCode: code });
  } catch (err) {
    next(err);
  }
}

module.exports = { updateConfigHandler, startGameHandler };