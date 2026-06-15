const { createError } = require('../middlewares/errorHandler');
const {
  getRoom,
  getPlayer,
  isNameTaken,
  getPlayersArray,
} = require('../utils/roomManager');
const { validatePlayerName } = require('../utils/gameValidators');

function setPlayerNameHandler(req, res, next) {
  try {
    const code = req.params.code.toUpperCase();
    const { playerName } = req.body;

    const nameError = validatePlayerName(playerName);
    if (nameError) return next(createError(400, 'INVALID_NAME', nameError));

    const room = getRoom(code);
    if (!room) return next(createError(404, 'ROOM_NOT_FOUND', 'Room not found'));

    if (room.phase !== 'lobby') {
      return next(createError(403, 'GAME_IN_PROGRESS', 'Cannot change name after game has started'));
    }

    const playerId = req.session.playerId;
    const player = getPlayer(code, playerId);
    if (!player) return next(createError(404, 'PLAYER_NOT_FOUND', 'You are not in this room'));

    const trimmed = playerName.trim();
    if (isNameTaken(code, trimmed, playerId)) {
      return next(createError(409, 'NAME_TAKEN', 'That name is already taken in this room'));
    }

    const oldName = player.name;
    player.name = trimmed;

    res.json({
      player: { id: player.id, name: player.name, isHost: player.isHost },
      oldName,
    });
  } catch (err) {
    next(err);
  }
}

function getPlayersHandler(req, res, next) {
  try {
    const code = req.params.code.toUpperCase();
    const room = getRoom(code);
    if (!room) return next(createError(404, 'ROOM_NOT_FOUND', 'Room not found'));

    const players = getPlayersArray(code).map(p => ({
      id: p.id,
      name: p.name,
      isHost: p.isHost,
    }));

    res.json({ players });
  } catch (err) {
    next(err);
  }
}

module.exports = { setPlayerNameHandler, getPlayersHandler };