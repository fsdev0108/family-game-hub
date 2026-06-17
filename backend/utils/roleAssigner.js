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

function assignImposterRoles(players) {
  const roles = {};
  players.forEach(p => { roles[p.id] = 'normal'; });
  // Imposter is assigned later by the word setter during word submission
  return { roles };
}

module.exports = { assignWinkMurderRoles, assignImposterRoles };