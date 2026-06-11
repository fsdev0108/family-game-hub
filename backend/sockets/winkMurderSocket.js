const { getRoom, getPlayer, setRoomPhase, getPlayersArray, deleteRoom } = require('../utils/roomManager');
const { assignWinkMurderRoles } = require('../utils/roleAssigner');

const gameStates = new Map();

function getGameState(roomCode) {
  return gameStates.get(roomCode) || null;
}

function winkMurderSocket(socket, ns) {
  const { playerId, roomCode, isHost } = socket;

  socket.join(roomCode);

  const room = getRoom(roomCode);
  if (!room) return socket.disconnect(true);

  if (!gameStates.has(roomCode)) {
    const players = getPlayersArray(roomCode);
    const roles = assignWinkMurderRoles(players, room.config);

    gameStates.set(roomCode, {
      roles,
      eliminated: new Set(),
      readyPlayers: new Set(),
      playerCount: players.length,
      phase: 'role-reveal',
      accusationsUsed: new Set(),
    });
  }

  const state = getGameState(roomCode);
  const myRole = state.roles[playerId];

  socket.emit('wm:roles_dealt', { role: myRole });

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

    state.eliminated.add(target.id);
    ns.to(roomCode).emit('wm:player_winked', { targetName });

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

  socket.on('disconnect', () => {
    const room = getRoom(roomCode);
    if (!room) return;

    if (isHost) {
      ns.to(roomCode).emit('error', { code: 'HOST_DISCONNECTED', message: 'Host disconnected. Game over.' });
      gameStates.delete(roomCode);
      deleteRoom(roomCode);
    }
  });
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