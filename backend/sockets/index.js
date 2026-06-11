const { createSocketAuthMiddleware } = require('../middlewares/socketAuth');
const lobbySocket = require('./lobbySocket');
const winkMurderSocket = require('./winkMurderSocket');
const imposterSocket = require('./imposterSocket');

function initSockets(io, sessionMiddleware) {
  const socketAuth = createSocketAuthMiddleware(sessionMiddleware);

  const lobbyNS = io.of('/lobby');
  const winkNS = io.of('/wink-murder');
  const imposterNS = io.of('/imposter');

  lobbyNS.use(socketAuth);
  winkNS.use(socketAuth);
  imposterNS.use(socketAuth);

  lobbyNS.on('connection', (socket) => lobbySocket(socket, lobbyNS));
  winkNS.on('connection', (socket) => winkMurderSocket(socket, winkNS));
  imposterNS.on('connection', (socket) => imposterSocket(socket, imposterNS));
}

module.exports = initSockets;