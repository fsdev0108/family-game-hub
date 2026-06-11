const { getRoom, getPlayer, getPlayersArray, setRoomPhase, deleteRoom } = require('../utils/roomManager');
const { assignImposterRoles } = require('../utils/roleAssigner');

const gameStates = new Map();

function imposterSocket(socket, ns) {
  const { playerId, roomCode, isHost } = socket;

  socket.join(roomCode);

  const room = getRoom(roomCode);
  if (!room) return socket.disconnect(true);

  if (!gameStates.has(roomCode)) {
    const players = getPlayersArray(roomCode);
    const { roles, imposterId } = assignImposterRoles(players, room.config);

    gameStates.set(roomCode, {
      roles,
      imposterId,
      wordSetterId: room.config.wordSetterId,
      normalWord: null,
      imposterWord: null,
      votes: new Map(),
      votedNames: [],
      readyPlayers: new Set(),
      playerCount: players.length,
      phase: 'waiting-words',
      votingTimer: null,
    });
  }

  const state = gameStates.get(roomCode);

  socket.emit('imp:roles_dealt', { role: state.roles[playerId] });

  socket.on('imp:submit_words', ({ normalWord, imposterWord }) => {
    if (playerId !== state.wordSetterId) {
      return socket.emit('error', { code: 'NOT_WORD_SETTER', message: 'Only the word setter can submit words' });
    }
    if (state.phase !== 'waiting-words') return;

    if (!normalWord || !imposterWord || typeof normalWord !== 'string' || typeof imposterWord !== 'string') {
      return socket.emit('error', { code: 'INVALID_WORDS', message: 'Both words are required' });
    }
    if (normalWord.trim().toLowerCase() === imposterWord.trim().toLowerCase()) {
      return socket.emit('error', { code: 'SAME_WORDS', message: 'Normal and imposter words must be different' });
    }

    state.normalWord = normalWord.trim();
    state.imposterWord = imposterWord.trim();
    state.phase = 'playing';

    const players = getPlayersArray(roomCode);
    players.forEach(player => {
      const word = state.roles[player.id] === 'imposter' ? state.imposterWord : state.normalWord;
      const playerSocket = findSocketByPlayerId(ns, player.id);
      if (playerSocket) {
        playerSocket.emit('imp:words_set', { word });
      }
    });

    ns.to(roomCode).emit('imp:words_distributed');
  });

  socket.on('imp:open_voting', () => {
    if (!isHost) return socket.emit('error', { code: 'FORBIDDEN', message: 'Only the host can open voting' });
    if (state.phase !== 'playing') return;

    state.phase = 'voting';
    state.votes.clear();
    state.votedNames = [];

    const players = getPlayersArray(roomCode);
    ns.to(roomCode).emit('imp:voting_open', {
      players: players.map(p => p.name),
      durationSeconds: 60,
    });

    state.votingTimer = setTimeout(() => {
      resolveVoting(roomCode, ns, state);
    }, 60000);
  });

  socket.on('imp:vote', ({ votedFor }) => {
    if (state.phase !== 'voting') return;
    if (state.votes.has(playerId)) return;

    const players = getPlayersArray(roomCode);
    const target = players.find(p => p.name === votedFor);
    if (!target) return socket.emit('error', { code: 'PLAYER_NOT_FOUND', message: 'Player not found' });

    const voter = getPlayer(roomCode, playerId);
    if (!voter) return;

    state.votes.set(playerId, target.id);
    if (!state.votedNames.includes(voter.name)) {
      state.votedNames.push(voter.name);
    }

    ns.to(roomCode).emit('imp:vote_update', { votedNames: state.votedNames });

    if (state.votes.size === state.playerCount) {
      clearTimeout(state.votingTimer);
      resolveVoting(roomCode, ns, state);
    }
  });

  socket.on('disconnect', () => {
    const room = getRoom(roomCode);
    if (!room) return;

    if (isHost) {
      if (state.votingTimer) clearTimeout(state.votingTimer);
      ns.to(roomCode).emit('error', { code: 'HOST_DISCONNECTED', message: 'Host disconnected. Game over.' });
      gameStates.delete(roomCode);
      deleteRoom(roomCode);
    }
  });
}

function resolveVoting(roomCode, ns, state) {
  state.phase = 'ended';

  const room = getRoom(roomCode);
  if (!room) return;

  const players = getPlayersArray(roomCode);
  const tally = {};
  players.forEach(p => { tally[p.id] = 0; });
  state.votes.forEach(targetId => { tally[targetId] = (tally[targetId] || 0) + 1; });

  let maxVotes = 0;
  let eliminatedId = null;
  for (const [id, count] of Object.entries(tally)) {
    if (count > maxVotes) {
      maxVotes = count;
      eliminatedId = id;
    }
  }

  const voteTallyByName = {};
  Object.entries(tally).forEach(([id, count]) => {
    const player = players.find(p => p.id === id);
    if (player) voteTallyByName[player.name] = count;
  });

  const eliminated = players.find(p => p.id === eliminatedId);
  const imposter = players.find(p => p.id === state.imposterId);
  const imposterCaught = eliminatedId === state.imposterId;

  ns.to(roomCode).emit('imp:game_over', {
    winner: imposterCaught ? 'players' : 'imposter',
    imposterName: imposter?.name,
    eliminatedName: eliminated?.name,
    normalWord: state.normalWord,
    imposterWord: state.imposterWord,
    voteTally: voteTallyByName,
  });

  setRoomPhase(roomCode, 'ended');
  gameStates.delete(roomCode);
}

function findSocketByPlayerId(ns, playerId) {
  for (const [, socket] of ns.sockets) {
    if (socket.playerId === playerId) return socket;
  }
  return null;
}

module.exports = imposterSocket;