const {
  getRoom,
  getPlayer,
  removePlayer,
  isNameTaken,
  getPlayersArray,
  updateRoomConfig,
  setRoomPhase,
} = require('../utils/roomManager');
const { validatePlayerName, validateWinkMurderConfig, validateImposterConfig } = require('../utils/gameValidators');

function lobbySocket(socket, ns) {
  const { playerId, roomCode, playerName, isHost } = socket;

  socket.join(roomCode);

  ns.to(roomCode).emit('lobby:player_joined', {
    player: { id: playerId, name: playerName, isHost },
  });

  socket.on('lobby:rename', ({ newName }) => {
    const nameError = validatePlayerName(newName);
    if (nameError) {
      return socket.emit('lobby:error', { code: 'INVALID_NAME', message: nameError });
    }

    const trimmed = newName.trim();
    if (isNameTaken(roomCode, trimmed, playerId)) {
      return socket.emit('lobby:error', { code: 'NAME_TAKEN', message: 'That name is already taken' });
    }

    const room = getRoom(roomCode);
    if (!room || room.phase !== 'lobby') {
      return socket.emit('lobby:error', { code: 'GAME_IN_PROGRESS', message: 'Cannot rename after game starts' });
    }

    const player = getPlayer(roomCode, playerId);
    if (!player) return;

    const oldName = player.name;
    player.name = trimmed;
    socket.playerName = trimmed;

    ns.to(roomCode).emit('lobby:player_renamed', { oldName, newName: trimmed });
  });

  socket.on('lobby:update_config', (config) => {
    if (!isHost) {
      return socket.emit('lobby:error', { code: 'FORBIDDEN', message: 'Only the host can update config' });
    }

    const room = getRoom(roomCode);
    if (!room || room.phase !== 'lobby') return;

    const players = getPlayersArray(roomCode);
    let validationError = null;

    if (room.gameType === 'wink-murder') {
      validationError = validateWinkMurderConfig(config, players.length);
    } else if (room.gameType === 'imposter') {
      validationError = validateImposterConfig(config, players.map(p => p.id));
    }

    if (validationError) {
      return socket.emit('lobby:error', { code: 'INVALID_CONFIG', message: validationError });
    }

    updateRoomConfig(roomCode, config);
    ns.to(roomCode).emit('lobby:config_updated', { config });
  });

  socket.on('lobby:start_game', () => {
    if (!isHost) {
      return socket.emit('lobby:error', { code: 'FORBIDDEN', message: 'Only the host can start the game' });
    }

    const room = getRoom(roomCode);
    if (!room || room.phase !== 'lobby') return;

    if (room.players.size < 3) {
      return socket.emit('lobby:error', {
        code: 'NOT_ENOUGH_PLAYERS',
        message: `Need at least 3 players. Currently have ${room.players.size}`,
      });
    }

    setRoomPhase(roomCode, 'starting');
    ns.to(roomCode).emit('lobby:game_starting', { gameType: room.gameType });
  });

  socket.on('disconnect', () => {
    const room = getRoom(roomCode);

    // If the game has already started, the player is just navigating to the game page.
    // Do NOT remove them from the room — the game socket still needs to find them.
    if (!room || room.phase !== 'lobby') return;

    removePlayer(roomCode, playerId);

    // Room was deleted (last player left)
    if (!getRoom(roomCode)) return;

    ns.to(roomCode).emit('lobby:player_left', { playerName });

    if (isHost) {
      ns.to(roomCode).emit('lobby:error', {
        code: 'HOST_LEFT',
        message: 'The host has left. The room has been closed.',
      });
    }
  });
}

module.exports = lobbySocket;