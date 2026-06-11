const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { createError } = require('../middlewares/errorHandler');
const { generateUniqueCode } = require('../utils/codeGenerator');
const {
  createRoom,
  getRoom,
  deleteRoom,
  getRoomCodes,
  addPlayer,
  getPlayersArray,
} = require('../utils/roomManager');
const {
  validateGameType,
  validatePassword,
  validatePlayerName,
} = require('../utils/gameValidators');

async function createRoomHandler(req, res, next) {
  try {
    const { gameType, password, playerName } = req.body;

    const gameTypeError = validateGameType(gameType);
    if (gameTypeError) return next(createError(400, 'INVALID_GAME_TYPE', gameTypeError));

    const passwordError = validatePassword(password);
    if (passwordError) return next(createError(400, 'INVALID_PASSWORD', passwordError));

    const nameError = validatePlayerName(playerName);
    if (nameError) return next(createError(400, 'INVALID_NAME', nameError));

    const code = generateUniqueCode(getRoomCodes());
    const passwordHash = await bcrypt.hash(password.trim(), 10);
    const playerId = uuidv4();

    const room = createRoom({ code, passwordHash, hostId: playerId, gameType });

    const host = {
      id: playerId,
      name: playerName.trim(),
      isHost: true,
      joinedAt: Date.now(),
    };

    addPlayer(code, host);

    req.session.playerId = playerId;
    req.session.roomCode = code;
    req.session.isHost = true;

    res.status(201).json({
      roomCode: code,
      gameType: room.gameType,
      player: { id: playerId, name: host.name, isHost: true },
    });
  } catch (err) {
    next(err);
  }
}

async function joinRoomHandler(req, res, next) {
  try {
    const { roomCode, password, playerName } = req.body;

    if (!roomCode) return next(createError(400, 'MISSING_CODE', 'Room code is required'));

    const nameError = validatePlayerName(playerName);
    if (nameError) return next(createError(400, 'INVALID_NAME', nameError));

    const room = getRoom(roomCode.toUpperCase());
    if (!room) return next(createError(404, 'ROOM_NOT_FOUND', 'Room not found. Check the code and try again.'));

    if (room.phase !== 'lobby') {
      return next(createError(403, 'GAME_IN_PROGRESS', 'This game has already started'));
    }

    const passwordMatch = await bcrypt.compare(password, room.passwordHash);
    if (!passwordMatch) return next(createError(401, 'WRONG_PASSWORD', 'Incorrect room password'));

    for (const player of room.players.values()) {
      if (player.name.toLowerCase() === playerName.trim().toLowerCase()) {
        return next(createError(409, 'NAME_TAKEN', 'That name is already taken in this room'));
      }
    }

    const playerId = uuidv4();
    const player = {
      id: playerId,
      name: playerName.trim(),
      isHost: false,
      joinedAt: Date.now(),
    };

    addPlayer(roomCode.toUpperCase(), player);

    req.session.playerId = playerId;
    req.session.roomCode = roomCode.toUpperCase();
    req.session.isHost = false;

    res.status(200).json({
      roomCode: roomCode.toUpperCase(),
      gameType: room.gameType,
      player: { id: playerId, name: player.name, isHost: false },
    });
  } catch (err) {
    next(err);
  }
}

function getRoomHandler(req, res, next) {
  try {
    const room = getRoom(req.params.code.toUpperCase());
    if (!room) return next(createError(404, 'ROOM_NOT_FOUND', 'Room not found'));

    res.json({
      code: room.code,
      gameType: room.gameType,
      phase: room.phase,
      playerCount: room.players.size,
      players: getPlayersArray(room.code).map(p => ({
        name: p.name,
        isHost: p.isHost,
      })),
    });
  } catch (err) {
    next(err);
  }
}

function deleteRoomHandler(req, res, next) {
  try {
    const code = req.params.code.toUpperCase();
    const room = getRoom(code);
    if (!room) return next(createError(404, 'ROOM_NOT_FOUND', 'Room not found'));

    deleteRoom(code);

    req.session.destroy(() => {});

    res.json({ message: 'Room dissolved' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createRoomHandler,
  joinRoomHandler,
  getRoomHandler,
  deleteRoomHandler,
};