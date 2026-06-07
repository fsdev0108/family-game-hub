const rooms = new Map();

function createRoom({ code, passwordHash, hostId, gameType }) {
  const room = {
    code,
    passwordHash,
    hostId,
    gameType,
    phase: 'lobby',
    players: new Map(),
    config: {},
    createdAt: Date.now(),
  };
  rooms.set(code, room);
  return room;
}

function getRoom(code) {
  return rooms.get(code) || null;
}

function deleteRoom(code) {
  rooms.delete(code);
}

function getRoomCodes() {
  return rooms;
}

function addPlayer(code, player) {
  const room = getRoom(code);
  if (!room) return null;
  room.players.set(player.id, player);
  return room;
}

function removePlayer(code, playerId) {
  const room = getRoom(code);
  if (!room) return null;
  room.players.delete(playerId);
  if (room.players.size === 0) {
    deleteRoom(code);
    return null;
  }
  return room;
}

function getPlayer(code, playerId) {
  const room = getRoom(code);
  if (!room) return null;
  return room.players.get(playerId) || null;
}

function isNameTaken(code, name, excludeId = null) {
  const room = getRoom(code);
  if (!room) return false;
  for (const [id, player] of room.players) {
    if (id === excludeId) continue;
    if (player.name.toLowerCase() === name.toLowerCase()) return true;
  }
  return false;
}

function updateRoomConfig(code, config) {
  const room = getRoom(code);
  if (!room) return null;
  room.config = { ...room.config, ...config };
  return room;
}

function setRoomPhase(code, phase) {
  const room = getRoom(code);
  if (!room) return null;
  room.phase = phase;
  return room;
}

function getPlayersArray(code) {
  const room = getRoom(code);
  if (!room) return [];
  return Array.from(room.players.values());
}

module.exports = {
  createRoom,
  getRoom,
  deleteRoom,
  getRoomCodes,
  addPlayer,
  removePlayer,
  getPlayer,
  isNameTaken,
  updateRoomConfig,
  setRoomPhase,
  getPlayersArray,
};