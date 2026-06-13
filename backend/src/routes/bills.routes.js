const router = require('express').Router();
const ctrl = require('../controllers/bills.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', authorize('ADMIN', 'MANAGER', 'CASHIER'), ctrl.getBills);
router.post('/', authorize('CASHIER'), ctrl.generateBill);
router.patch('/:id/pay', authorize('CASHIER'), ctrl.markBillPaid);

module.exports = router;
