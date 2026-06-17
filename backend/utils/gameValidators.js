const GAME_TYPES = ['wink-murder', 'imposter'];
const MIN_PLAYERS = 3;
const MAX_PLAYERS = 12;
const NAME_MAX_LENGTH = 20;
const NAME_MIN_LENGTH = 2;
const PASSWORD_MAX_LENGTH = 20;
const PASSWORD_MIN_LENGTH = 3;

function validateGameType(gameType) {
  if (!GAME_TYPES.includes(gameType)) {
    return `Game type must be one of: ${GAME_TYPES.join(', ')}`;
  }
  return null;
}

function validatePlayerName(name) {
  if (!name || typeof name !== 'string') return 'Name is required';
  const trimmed = name.trim();
  if (trimmed.length < NAME_MIN_LENGTH) return `Name must be at least ${NAME_MIN_LENGTH} characters`;
  if (trimmed.length > NAME_MAX_LENGTH) return `Name must be at most ${NAME_MAX_LENGTH} characters`;
  if (!/^[a-zA-Z0-9 _-]+$/.test(trimmed)) return 'Name can only contain letters, numbers, spaces, hyphens and underscores';
  return null;
}

function validatePassword(password) {
  if (!password || typeof password !== 'string') return 'Password is required';
  const trimmed = password.trim();
  if (trimmed.length < PASSWORD_MIN_LENGTH) return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  if (trimmed.length > PASSWORD_MAX_LENGTH) return `Password must be at most ${PASSWORD_MAX_LENGTH} characters`;
  return null;
}

function validateWinkMurderConfig(config, playerCount) {
  const { killerCount, detectiveCount } = config;

  if (!Number.isInteger(killerCount) || killerCount < 1) {
    return 'There must be at least 1 killer';
  }
  if (!Number.isInteger(detectiveCount) || detectiveCount < 0) {
    return 'Detective count must be 0 or more';
  }

  const civilianCount = playerCount - killerCount - detectiveCount;
  if (civilianCount < 1) {
    return `Too many killers/detectives for ${playerCount} players. At least 1 civilian is required`;
  }
  if (killerCount >= playerCount) {
    return 'Killers cannot equal or outnumber all players';
  }
  return null;
}

function validateImposterConfig(config, playerIds) {
  const { wordSetterId } = config;
  if (!wordSetterId) return 'A word setter must be selected';
  if (!playerIds.includes(wordSetterId)) return 'Word setter must be a player in the room';
  return null;
}

function canStartGame(room) {
  const playerCount = room.players.size;
  if (playerCount < MIN_PLAYERS) {
    return `Need at least ${MIN_PLAYERS} players to start. Currently have ${playerCount}`;
  }
  if (playerCount > MAX_PLAYERS) {
    return `Room is over the maximum of ${MAX_PLAYERS} players`;
  }
  return null;
}

module.exports = {
  GAME_TYPES,
  MIN_PLAYERS,
  MAX_PLAYERS,
  validateGameType,
  validatePlayerName,
  validatePassword,
  validateWinkMurderConfig,
  validateImposterConfig,
  canStartGame,
};