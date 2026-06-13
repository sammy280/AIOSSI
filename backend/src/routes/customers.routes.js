const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const prisma = require('../config/database');

router.use(authenticate, authorize('ADMIN', 'MANAGER'));

router.get('/', async (req, res, next) => {
  try {
    const customers = await prisma.customer.findMany({ orderBy: { totalSpent: 'desc' } });
    res.json({ success: true, data: customers });
  } catch (err) { next(err); }
});

router.get('/top', async (req, res, next) => {
  try {
    const customers = await prisma.customer.findMany({ orderBy: { totalSpent: 'desc' }, take: 10 });
    res.json({ success: true, data: customers });
  } catch (err) { next(err); }
});

module.exports = router;
