const router = require('express').Router();
const ctrl = require('../controllers/orders.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/', authorize('ADMIN', 'MANAGER', 'CASHIER', 'WAITER', 'KITCHEN', 'BAR'), ctrl.getOrders);
router.get('/:id', authorize('ADMIN', 'MANAGER', 'CASHIER', 'WAITER', 'KITCHEN', 'BAR'), ctrl.getOrderById);
router.post('/', authorize('WAITER'), ctrl.createOrder);
router.patch('/:id/cancel', authorize('ADMIN', 'MANAGER', 'WAITER'), ctrl.cancelOrder);
router.patch('/:id/served', authorize('WAITER'), ctrl.markServed);
router.post('/:id/request-bill', authorize('WAITER'), ctrl.requestBill);

module.exports = router;
