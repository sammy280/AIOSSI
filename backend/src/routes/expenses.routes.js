const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const prisma = require('../config/database');

router.use(authenticate, authorize('ADMIN', 'MANAGER'));

router.get('/', async (req, res, next) => {
  try {
    const { category, startDate, endDate } = req.query;
    const where = {};
    if (category) where.category = category;
    if (startDate || endDate) { where.date = {}; if (startDate) where.date.gte = new Date(startDate); if (endDate) where.date.lte = new Date(endDate); }
    const expenses = await prisma.expense.findMany({ where, include: { recorder: { select: { id: true, name: true } } }, orderBy: { date: 'desc' } });
    const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    res.json({ success: true, data: expenses, meta: { total } });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const expense = await prisma.expense.create({ data: { ...req.body, amount: parseFloat(req.body.amount), date: new Date(req.body.date), recordedBy: req.user.id } });
    res.status(201).json({ success: true, data: expense });
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const expense = await prisma.expense.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: expense });
  } catch (err) { next(err); }
});

module.exports = router;
