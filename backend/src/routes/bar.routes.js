const router = require('express').Router();
const ctrl = require('../controllers/bar.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', authorize('ADMIN', 'MANAGER', 'BAR'), ctrl.getBarOrders);
router.patch('/:id/status', authorize('BAR', 'ADMIN', 'MANAGER'), ctrl.updateBarStatus);

module.exports = router;
