const router = require('express').Router();
const ctrl = require('../controllers/inventory.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('ADMIN', 'MANAGER'));
router.get('/', ctrl.getInventory);
router.post('/', ctrl.createInventoryItem);
router.put('/:id', ctrl.updateInventoryItem);
router.post('/:id/adjust', ctrl.adjustInventory);
router.get('/movements', ctrl.getMovements);
router.get('/reconciliations', ctrl.getReconciliations);
router.post('/reconciliations', ctrl.createReconciliation);

module.exports = router;
