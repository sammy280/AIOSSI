const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const prisma = require('../config/database');

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const { userId, date } = req.query;
    const where = {};
    if (userId) where.userId = userId;
    else if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') where.userId = req.user.id;
    if (date) { const d = new Date(date); where.date = { gte: d, lt: new Date(d.getTime() + 86400000) }; }
    const shifts = await prisma.shift.findMany({ where, include: { user: { select: { id: true, name: true, role: true } } }, orderBy: { date: 'asc' } });
    res.json({ success: true, data: shifts });
  } catch (err) { next(err); }
});

router.post('/', authorize('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { userId, shiftType, shiftName, date, startTime, endTime, notes } = req.body;
    const shift = await prisma.shift.create({
      data: { userId, shiftType, shiftName, date: new Date(date), startTime: new Date(startTime), endTime: new Date(endTime), assignedBy: req.user.id, notes },
      include: { user: { select: { id: true, name: true, role: true } } },
    });
    res.status(201).json({ success: true, data: shift });
  } catch (err) { next(err); }
});

module.exports = router;
