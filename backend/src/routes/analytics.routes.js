const router = require('express').Router();
const ctrl = require('../controllers/analytics.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('ADMIN', 'MANAGER'));
router.get('/dashboard', ctrl.getDashboard);
router.get('/sales', ctrl.getSalesAnalytics);
router.get('/revenue', ctrl.getRevenueReport);

module.exports = router;
