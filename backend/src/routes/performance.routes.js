const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const prisma = require('../config/database');

router.use(authenticate, authorize('ADMIN', 'MANAGER'));

router.get('/leaderboard', async (req, res, next) => {
  try {
    const { period = 'daily' } = req.query;
    const now = new Date();
    let start = new Date();
    if (period === 'daily') start.setHours(0, 0, 0, 0);
    else if (period === 'weekly') { start.setDate(now.getDate() - 7); }
    else if (period === 'monthly') { start.setDate(1); start.setHours(0, 0, 0, 0); }

    // Top waiters by orders served
    const waiters = await prisma.user.findMany({
      where: { role: 'WAITER', isActive: true },
      include: {
        assignedOrders: {
          where: { status: 'SERVED', createdAt: { gte: start } },
          include: { bill: { include: { payment: true } } },
        },
      },
    });

    const leaderboard = waiters.map(w => ({
      id: w.id, name: w.name, role: w.role,
      ordersServed: w.assignedOrders.length,
      revenue: w.assignedOrders.reduce((sum, o) => sum + (o.bill?.payment ? parseFloat(o.bill.payment.amount) : 0), 0),
    })).sort((a, b) => b.ordersServed - a.ordersServed);

    res.json({ success: true, data: leaderboard });
  } catch (err) { next(err); }
});

router.get('/reports', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const where = {};
    if (startDate || endDate) { where.date = {}; if (startDate) where.date.gte = new Date(startDate); if (endDate) where.date.lte = new Date(endDate); }
    const metrics = await prisma.performanceMetric.findMany({ where, include: { profile: { include: { user: { select: { id: true, name: true, role: true } } } } }, orderBy: { revenue: 'desc' } });
    res.json({ success: true, data: metrics });
  } catch (err) { next(err); }
});

module.exports = router;
