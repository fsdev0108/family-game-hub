function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function assignWinkMurderRoles(players, config, previousRoles = null) {
  const killerCount = Number.isInteger(config?.killerCount) ? config.killerCount : 1;
  const detectiveCount = Number.isInteger(config?.detectiveCount) ? config.detectiveCount : 0;

  let roles = {};
  let attempts = 0;

  do {
    const playerIds = shuffle(players.map(p => p.id));
    roles = {};
    playerIds.forEach((id, index) => {
      if (index < killerCount) roles[id] = 'killer';
      else if (index < killerCount + detectiveCount) roles[id] = 'detective';
      else roles[id] = 'civilian';
    });
    attempts++;
  } while (
    previousRoles !== null &&
    attempts < 10 &&
    Object.keys(roles).every(id => roles[id] === previousRoles[id])
  );

  return roles;
}

function assignImposterRoles(players, config) {
  const { imposterSelectionMode, imposterId: manualImposterId, wordSetterId } = config;

  const roles = {};
  players.forEach(p => { roles[p.id] = 'normal'; });

  let imposterId;
  if (imposterSelectionMode === 'manual') {
    imposterId = manualImposterId;
  } else {
    const eligiblePlayers = players.filter(p => p.id !== wordSetterId);
    const chosen = eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)];
    imposterId = chosen.id;
  }

  roles[imposterId] = 'imposter';
  return { roles, imposterId };
}

module.exports = { assignWinkMurderRoles, assignImposterRoles };