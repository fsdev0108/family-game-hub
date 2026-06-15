const { getRoom, getPlayer, setRoomPhase, getPlayersArray, deleteRoom } = require('../utils/roomManager');
const { wmGameStates: gameStates } = require('../utils/gameStateStore');

// Grace period timers: if host disconnects, wait before destroying room
const hostTimers = new Map();

function winkMurderSocket(socket, ns) {
  const { playerId, roomCode, isHost } = socket;

  const room = getRoom(roomCode);
  if (!room) return socket.disconnect(true);

  // If host is reconnecting within the grace period, cancel the destruction timer
  if (isHost && hostTimers.has(roomCode)) {
    clearTimeout(hostTimers.get(roomCode));
    hostTimers.delete(roomCode);
  }

  socket.join(roomCode);

  const state = gameStates.get(roomCode);
  if (!state) return socket.disconnect(true);

  const role = state.roles[playerId];
  console.log(`[${roomCode}] wm socket: player="${socket.playerName}" playerId="${playerId}" role="${role}" rolesKeys=${JSON.stringify(Object.keys(state.roles))}`);
  socket.emit('wm:roles_dealt', { role });

  socket.on('wm:ready', () => {
    state.readyPlayers.add(playerId);
    if (state.readyPlayers.size === state.playerCount) {
      state.phase = 'playing';
      ns.to(roomCode).emit('wm:all_ready');
    }
  });

  socket.on('wm:wink', ({ targetName }) => {
    if (state.roles[playerId] !== 'killer') {
      return socket.emit('error', { code: 'NOT_A_KILLER', message: 'Only killers can wink' });
    }
    if (state.phase !== 'playing') return;

    const players = getPlayersArray(roomCode);
    const target = players.find(p => p.name === targetName);
    if (!target) return socket.emit('error', { code: 'PLAYER_NOT_FOUND', message: 'Player not found' });
    if (state.eliminated.has(target.id)) return;
    if (target.id === playerId) return;

    if (state.roles[target.id] === 'detective') {
      // Detective catches the killer in the act — killer is eliminated
      const killerName = players.find(p => p.id === playerId)?.name;
      state.eliminated.add(playerId);
      ns.to(roomCode).emit('wm:killer_caught', { killerName, detectiveName: targetName });
    } else {
      state.eliminated.add(target.id);
      ns.to(roomCode).emit('wm:player_winked', { targetName });
    }
    checkWinkMurderEnd(roomCode, ns, state);
  });

  socket.on('wm:accuse', ({ accusedName }) => {
    if (state.roles[playerId] !== 'detective') {
      return socket.emit('error', { code: 'NOT_A_DETECTIVE', message: 'Only detectives can accuse' });
    }
    if (state.phase !== 'playing') return;
    if (state.eliminated.has(playerId)) return;
    if (state.accusationsUsed.has(playerId)) {
      return socket.emit('error', { code: 'ACCUSATION_USED', message: 'You have already used your accusation' });
    }

    const players = getPlayersArray(roomCode);
    const accused = players.find(p => p.name === accusedName);
    if (!accused) return socket.emit('error', { code: 'PLAYER_NOT_FOUND', message: 'Player not found' });

    state.accusationsUsed.add(playerId);
    const correct = state.roles[accused.id] === 'killer';

    if (correct) {
      state.eliminated.add(accused.id);
    } else {
      state.eliminated.add(playerId);
    }

    ns.to(roomCode).emit('wm:accusation_result', {
      accuserName: getPlayersArray(roomCode).find(p => p.id === playerId)?.name,
      accusedName,
      accusedRole: state.roles[accused.id],
      correct,
    });

    checkWinkMurderEnd(roomCode, ns, state);
  });

  // Host can end the game at any time
  socket.on('wm:end_game', () => {
    if (!isHost) return;
    endGame(roomCode, ns, state, 'host_ended');
  });

  // Host restarts — clears game state and sends everyone back to lobby
  socket.on('wm:restart_game', () => {
    if (!isHost) return;
    if (state.phase !== 'ended') state.phase = 'ended';
    gameStates.delete(roomCode);
    setRoomPhase(roomCode, 'lobby');
    ns.to(roomCode).emit('wm:game_restarted');
  });

  socket.on('disconnect', () => {
    const room = getRoom(roomCode);
    if (!room) return;

    if (isHost) {
      // Give the host 10 seconds to reconnect (handles accidental refresh)
      const timer = setTimeout(() => {
        hostTimers.delete(roomCode);
        if (getRoom(roomCode)) {
          ns.to(roomCode).emit('error', {
            code: 'HOST_DISCONNECTED',
            message: 'Host disconnected. Game over.',
          });
          gameStates.delete(roomCode);
          deleteRoom(roomCode);
        }
      }, 10000);
      hostTimers.set(roomCode, timer);
    }
  });
}

function endGame(roomCode, ns, state, reason) {
  if (!state || state.phase === 'ended') return;
  state.phase = 'ended';

  const players = getPlayersArray(roomCode);
  const rolesReveal = {};
  players.forEach(p => { rolesReveal[p.name] = state.roles[p.id]; });

  if (reason === 'host_ended') {
    ns.to(roomCode).emit('wm:game_over', {
      winner: 'none',
      roles: rolesReveal,
    });
  }

  setRoomPhase(roomCode, 'ended');
  gameStates.delete(roomCode);
}

function checkWinkMurderEnd(roomCode, ns, state) {
  const room = getRoom(roomCode);
  if (!room) return;

  const players = getPlayersArray(roomCode);
  const activePlayers = players.filter(p => !state.eliminated.has(p.id));
  const activeKillers = activePlayers.filter(p => state.roles[p.id] === 'killer');

  const killersWin = activeKillers.length > 0 &&
    activeKillers.length >= activePlayers.filter(p => state.roles[p.id] !== 'killer').length;
  const civilianWin = activeKillers.length === 0;

  if (killersWin || civilianWin) {
    state.phase = 'ended';
    const rolesReveal = {};
    players.forEach(p => { rolesReveal[p.name] = state.roles[p.id]; });

    ns.to(roomCode).emit('wm:game_over', {
      winner: killersWin ? 'killers' : 'civilians',
      roles: rolesReveal,
    });

    setRoomPhase(roomCode, 'ended');
    gameStates.delete(roomCode);
  }
}

module.exports = winkMurderSocket;
