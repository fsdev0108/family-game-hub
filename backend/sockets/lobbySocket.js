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
const { assignWinkMurderRoles, assignImposterRoles } = require('../utils/roleAssigner');
const { wmGameStates, impGameStates } = require('../utils/gameStateStore');

function lobbySocket(socket, ns) {
  const { playerId, roomCode, playerName, isHost } = socket;

  socket.join(roomCode);

  ns.to(roomCode).emit('lobby:player_joined', {
    player: { id: playerId, name: playerName, isHost },
  });

  // Send the current confirmed config to this player immediately.
  // This ensures they see the host's latest saved config without waiting
  // for the next change event.
  const currentRoom = getRoom(roomCode);
  if (currentRoom?.config) {
    socket.emit('lobby:config_updated', { config: currentRoom.config });
  }

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
    // Broadcast the merged server config (not the raw client value) so all
    // clients are always in sync with what the server actually stored.
    const updatedRoom = getRoom(roomCode);
    ns.to(roomCode).emit('lobby:config_updated', { config: updatedRoom.config });
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

    // Assign roles now, while all players are still in the lobby.
    // Game sockets will read from this pre-initialized state instead of
    // racing to assign roles when the first player connects.
    const players = getPlayersArray(roomCode);
    console.log(`[${roomCode}] Starting game. Players: ${players.map(p => p.name).join(', ')} | Config:`, room.config);
    if (room.gameType === 'wink-murder') {
      const roles = assignWinkMurderRoles(players, room.config);
      console.log(`[${roomCode}] Wink Murder roles:`, Object.fromEntries(players.map(p => [p.name, roles[p.id]])));
      wmGameStates.set(roomCode, {
        roles,
        eliminated: new Set(),
        readyPlayers: new Set(),
        playerCount: players.length,
        phase: 'role-reveal',
        accusationsUsed: new Set(),
      });
    } else if (room.gameType === 'imposter') {
      const { roles, imposterId } = assignImposterRoles(players, room.config);
      impGameStates.set(roomCode, {
        roles,
        imposterId,
        wordSetterId: room.config.wordSetterId,
        normalWord: null,
        imposterWord: null,
        votes: new Map(),
        votedNames: [],
        playerCount: players.length,
        phase: 'waiting-words',
        votingTimer: null,
      });
    }

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