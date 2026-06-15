function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function assignWinkMurderRoles(players, config) {
  // Fall back to sensible defaults if config was never explicitly saved
  const killerCount = Number.isInteger(config?.killerCount) ? config.killerCount : 1;
  const detectiveCount = Number.isInteger(config?.detectiveCount) ? config.detectiveCount : 0;
  const playerIds = shuffle(players.map(p => p.id));

  const roles = {};
  playerIds.forEach((id, index) => {
    if (index < killerCount) {
      roles[id] = 'killer';
    } else if (index < killerCount + detectiveCount) {
      roles[id] = 'detective';
    } else {
      roles[id] = 'civilian';
    }
  });

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