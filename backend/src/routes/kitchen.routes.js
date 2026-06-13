const router = require('express').Router();
const ctrl = require('../controllers/kitchen.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', authorize('ADMIN', 'MANAGER', 'KITCHEN'), ctrl.getKitchenOrders);
router.patch('/:id/status', authorize('KITCHEN', 'ADMIN', 'MANAGER'), ctrl.updateKitchenStatus);

module.exports = router;
