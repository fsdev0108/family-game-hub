const router = require('express').Router();
const auth = require('../middlewares/auth');
const hostOnly = require('../middlewares/hostOnly');
const { updateConfigHandler, startGameHandler } = require('../controllers/gameController');

router.put('/:code/config', auth, hostOnly, updateConfigHandler);
router.post('/:code/start', auth, hostOnly, startGameHandler);

module.exports = router;