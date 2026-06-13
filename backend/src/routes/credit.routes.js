const router = require('express').Router();
const ctrl = require('../controllers/credit.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', authorize('ADMIN', 'MANAGER', 'CASHIER'), ctrl.getCreditSales);
router.post('/', authorize('ADMIN', 'MANAGER', 'CASHIER'), ctrl.createCreditSale);
router.post('/:id/payment', authorize('ADMIN', 'MANAGER', 'CASHIER'), ctrl.recordPayment);

module.exports = router;
