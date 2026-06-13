const router = require('express').Router();
const ctrl = require('../controllers/tables.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', ctrl.getTables);
router.get('/:id', authorize('ADMIN', 'MANAGER', 'CASHIER', 'WAITER'), ctrl.getTableDetail);
router.post('/', authorize('ADMIN', 'MANAGER'), ctrl.createTable);
router.patch('/:id/status', authorize('ADMIN', 'MANAGER', 'CASHIER'), ctrl.updateTableStatus);

module.exports = router;
