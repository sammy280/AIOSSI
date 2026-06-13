const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const prisma = require('../config/database');

router.use(authenticate);

router.get('/', authorize('ADMIN', 'MANAGER', 'CASHIER'), async (req, res, next) => {
  try {
    const { method, startDate, endDate } = req.query;
    const where = {};
    if (method) where.method = method;
    if (startDate || endDate) { where.createdAt = {}; if (startDate) where.createdAt.gte = new Date(startDate); if (endDate) where.createdAt.lte = new Date(endDate); }
    const payments = await prisma.payment.findMany({ where, include: { cashier: { select: { id: true, name: true } }, bill: { include: { order: { include: { table: true } } } } }, orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: payments });
  } catch (err) { next(err); }
});

module.exports = router;
