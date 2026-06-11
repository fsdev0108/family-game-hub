const router = require('express').Router();
const auth = require('../middlewares/auth');
const hostOnly = require('../middlewares/hostOnly');
const { createRoomLimiter, joinRoomLimiter } = require('../middlewares/rateLimiter');
const {
  createRoomHandler,
  joinRoomHandler,
  getRoomHandler,
  deleteRoomHandler,
} = require('../controllers/roomController');

router.post('/', createRoomLimiter, createRoomHandler);
router.post('/join', joinRoomLimiter, joinRoomHandler);
router.get('/:code', auth, getRoomHandler);
router.delete('/:code', auth, hostOnly, deleteRoomHandler);

module.exports = router;