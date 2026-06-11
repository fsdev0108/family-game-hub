const { createError } = require('./errorHandler');

function auth(req, res, next) {
  if (!req.session || !req.session.playerId) {
    return next(createError(401, 'UNAUTHORIZED', 'No valid session. Please join a room first.'));
  }
  next();
}

module.exports = auth;