const router = require('express').Router();
const ctrl = require('../controllers/dailyReport.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/preview', authorize('ADMIN', 'MANAGER'), ctrl.getTodayPreview);
router.get('/', authorize('ADMIN', 'MANAGER'), ctrl.getReports);
router.get('/:id', authorize('ADMIN', 'MANAGER'), ctrl.getReport);
router.post('/', authorize('MANAGER'), ctrl.generateReport);
router.patch('/:id', authorize('MANAGER', 'ADMIN'), ctrl.updateReport);

module.exports = router;
