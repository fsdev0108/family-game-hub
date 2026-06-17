const { getRoom, getPlayer, getPlayersArray, setRoomPhase, deleteRoom } = require('../utils/roomManager');
const { impGameStates: gameStates } = require('../utils/gameStateStore');

const hostTimers = new Map();

function imposterSocket(socket, ns) {
  const { playerId, roomCode, isHost } = socket;

  const room = getRoom(roomCode);
  if (!room) return socket.disconnect(true);

  // Cancel pending host-disconnect timer if host reconnects
  if (isHost && hostTimers.has(roomCode)) {
    clearTimeout(hostTimers.get(roomCode));
    hostTimers.delete(roomCode);
  }

  socket.join(roomCode);

  const state = gameStates.get(roomCode);
  if (!state) return socket.disconnect(true);

  socket.emit('imp:roles_dealt', { role: state.roles[playerId], isWordSetter: state.wordSetterId === playerId });

  socket.on('imp:submit_words', ({ normalWord, imposterWord, imposterName }) => {
    if (playerId !== state.wordSetterId) {
      return socket.emit('error', { code: 'NOT_WORD_SETTER', message: 'Only the word setter can submit words' });
    }
    if (state.phase !== 'waiting-words') return;

    if (!normalWord || !imposterWord || typeof normalWord !== 'string' || typeof imposterWord !== 'string') {
      return socket.emit('error', { code: 'INVALID_WORDS', message: 'Both words are required' });
    }
    if (normalWord.trim().toLowerCase() === imposterWord.trim().toLowerCase()) {
      return socket.emit('error', { code: 'SAME_WORDS', message: 'Words must be different' });
    }

    const players = getPlayersArray(roomCode);

    // Assign imposter: manual pick by name or random from non-word-setters
    let imposterId;
    if (imposterName) {
      const picked = players.find(p => p.name === imposterName && p.id !== state.wordSetterId);
      if (!picked) {
        return socket.emit('error', { code: 'PLAYER_NOT_FOUND', message: 'Selected imposter not found' });
      }
      imposterId = picked.id;
    } else {
      const eligible = players.filter(p => p.id !== state.wordSetterId);
      imposterId = eligible[Math.floor(Math.random() * eligible.length)].id;
    }

    state.imposterId = imposterId;
    state.roles[imposterId] = 'imposter';
    state.normalWord = normalWord.trim();
    state.imposterWord = imposterWord.trim();
    state.phase = 'playing';

    players.forEach(player => {
      const word = state.roles[player.id] === 'imposter' ? state.imposterWord : state.normalWord;
      const role = state.roles[player.id];
      const playerSocket = findSocketByPlayerId(ns, player.id);
      if (playerSocket) playerSocket.emit('imp:words_set', { word, role });
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

    state.votingTimer = setTimeout(() => resolveVoting(roomCode, ns, state), 60000);
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
    if (!state.votedNames.includes(voter.name)) state.votedNames.push(voter.name);

    ns.to(roomCode).emit('imp:vote_update', { votedNames: state.votedNames });

    if (state.votes.size === state.playerCount) {
      clearTimeout(state.votingTimer);
      resolveVoting(roomCode, ns, state);
    }
  });

  // Host restarts or ends — clear state and send everyone back to lobby
  socket.on('imp:restart_game', () => {
    if (!isHost) return;
    if (state.votingTimer) clearTimeout(state.votingTimer);
    gameStates.delete(roomCode);
    setRoomPhase(roomCode, 'lobby');
    ns.to(roomCode).emit('imp:game_restarted');
  });

  // Host ends the game — same flow as restart (back to lobby, no game-over screen)
  socket.on('imp:end_game', () => {
    if (!isHost) return;
    if (state.votingTimer) clearTimeout(state.votingTimer);
    gameStates.delete(roomCode);
    setRoomPhase(roomCode, 'lobby');
    ns.to(roomCode).emit('imp:game_restarted');
  });

  socket.on('disconnect', () => {
    const room = getRoom(roomCode);
    if (!room) return;

    if (isHost) {
      // If game state already cleaned up (host ended/restarted), players are back
      // in lobby — don't destroy the room.
      if (!gameStates.has(roomCode)) return;

      const timer = setTimeout(() => {
        hostTimers.delete(roomCode);
        if (getRoom(roomCode) && gameStates.has(roomCode)) {
          if (state.votingTimer) clearTimeout(state.votingTimer);
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

function resolveVoting(roomCode, ns, state) {
  state.phase = 'ended';

  const room = getRoom(roomCode);
  if (!room) return;

  const players = getPlayersArray(roomCode);
  const tally = {};
  players.forEach(p => { tally[p.id] = 0; });
  state.votes.forEach(targetId => { tally[targetId] = (tally[targetId] || 0) + 1; });

  let maxVotes = 0;
  for (const count of Object.values(tally)) {
    if (count > maxVotes) maxVotes = count;
  }

  // Tie (or no votes) → no clear consensus → imposter escapes
  const topVotedIds = Object.keys(tally).filter(id => tally[id] === maxVotes);
  const isTie = topVotedIds.length > 1 || maxVotes === 0;
  const eliminatedId = isTie ? null : topVotedIds[0];

  const voteTallyByName = {};
  Object.entries(tally).forEach(([id, count]) => {
    const player = players.find(p => p.id === id);
    if (player) voteTallyByName[player.name] = count;
  });

  const voteDetailsByName = {};
  state.votes.forEach((targetId, voterId) => {
    const voter = players.find(p => p.id === voterId);
    const target = players.find(p => p.id === targetId);
    if (voter && target) voteDetailsByName[voter.name] = target.name;
  });

  const eliminated = eliminatedId ? players.find(p => p.id === eliminatedId) : null;
  const imposter = players.find(p => p.id === state.imposterId);
  const imposterCaught = !isTie && eliminatedId === state.imposterId;

  ns.to(roomCode).emit('imp:game_over', {
    winner: imposterCaught ? 'players' : 'imposter',
    imposterName: imposter?.name,
    eliminatedName: eliminated?.name ?? null,
    isTie,
    normalWord: state.normalWord,
    imposterWord: state.imposterWord,
    voteTally: voteTallyByName,
    voteDetails: voteDetailsByName,
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
