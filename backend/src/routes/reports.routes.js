const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const prisma = require('../config/database');
const { generatePDF } = require('../utils/pdf');
const { generateExcel } = require('../utils/excel');

router.use(authenticate, authorize('ADMIN', 'MANAGER'));

const getDateRange = (type, startDate, endDate) => {
  const now = new Date();
  if (type === 'daily') { const d = new Date(); d.setHours(0,0,0,0); return { gte: d }; }
  if (type === 'weekly') { const d = new Date(); d.setDate(d.getDate() - 7); return { gte: d }; }
  if (type === 'monthly') { const d = new Date(now.getFullYear(), now.getMonth(), 1); return { gte: d }; }
  if (type === 'quarterly') { const d = new Date(); d.setMonth(d.getMonth() - 3); return { gte: d }; }
  if (type === 'custom' && startDate && endDate) return { gte: new Date(startDate), lte: new Date(endDate) };
  return { gte: new Date(now.getFullYear(), 0, 1) };
};

router.get('/sales', async (req, res, next) => {
  try {
    const { type = 'daily', startDate, endDate, format = 'json' } = req.query;
    const dateRange = getDateRange(type, startDate, endDate);
    const payments = await prisma.payment.findMany({
      where: { createdAt: dateRange },
      include: { cashier: { select: { id: true, name: true } }, bill: { include: { order: { include: { items: { include: { product: true } }, table: true, seat: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    const total = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const data = { payments, total, count: payments.length, period: type };
    if (format === 'pdf') return generatePDF(res, 'sales', data);
    if (format === 'excel') return generateExcel(res, 'sales', data);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get('/summary', async (req, res, next) => {
  try {
    const { type = 'daily', startDate, endDate } = req.query;
    const dateRange = getDateRange(type, startDate, endDate);
    const [revenue, expenses, orders, attendance] = await Promise.all([
      prisma.payment.aggregate({ where: { createdAt: dateRange }, _sum: { amount: true }, _count: true }),
      prisma.expense.aggregate({ where: { date: dateRange }, _sum: { amount: true }, _count: true }),
      prisma.order.count({ where: { createdAt: dateRange, status: { not: 'CANCELLED' } } }),
      prisma.attendance.count({ where: { date: dateRange } }),
    ]);
    res.json({ success: true, data: { revenue: parseFloat(revenue._sum.amount || 0), transactions: revenue._count, expenses: parseFloat(expenses._sum.amount || 0), orders, attendance } });
  } catch (err) { next(err); }
});

module.exports = router;
