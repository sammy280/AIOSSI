const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const prisma = require('../config/database');

router.use(authenticate);

router.get('/', authorize('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { userId, date, startDate, endDate } = req.query;
    const where = {};
    if (userId) where.userId = userId;
    if (date) { const d = new Date(date); where.date = { gte: d, lt: new Date(d.getTime() + 86400000) }; }
    if (startDate && endDate) where.date = { gte: new Date(startDate), lte: new Date(endDate) };
    const records = await prisma.attendance.findMany({
      where,
      include: { user: { select: { id: true, name: true, role: true } }, shift: true },
      orderBy: { date: 'desc' },
    });
    res.json({ success: true, data: records });
  } catch (err) { next(err); }
});

// MANAGER / ADMIN clocks in an employee by their ID
router.post('/clock-in', authorize('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { employeeId, shiftId } = req.body;
    if (!employeeId) return res.status(400).json({ success: false, message: 'employeeId is required' });

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const existing = await prisma.attendance.findFirst({ where: { userId: employeeId, date: { gte: today } } });
    if (existing) return res.status(409).json({ success: false, message: 'Employee already clocked in today' });

    const record = await prisma.attendance.create({
      data: {
        userId: employeeId,
        date: new Date(),
        clockIn: new Date(),
        shiftId: shiftId || null,
        // Store who clocked them in via notes field if available
      },
      include: { user: { select: { id: true, name: true, role: true } } },
    });
    res.json({ success: true, data: record });
  } catch (err) { next(err); }
});

// MANAGER / ADMIN clocks out an employee
router.patch('/clock-out', authorize('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { employeeId } = req.body;
    if (!employeeId) return res.status(400).json({ success: false, message: 'employeeId is required' });

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const record = await prisma.attendance.findFirst({ where: { userId: employeeId, date: { gte: today }, clockOut: null } });
    if (!record) return res.status(404).json({ success: false, message: 'No active clock-in found for this employee today' });

    const hours = (Date.now() - new Date(record.clockIn).getTime()) / 3600000;
    const updated = await prisma.attendance.update({
      where: { id: record.id },
      data: { clockOut: new Date(), hoursWorked: Math.round(hours * 100) / 100 },
      include: { user: { select: { id: true, name: true, role: true } } },
    });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

// My own attendance records
router.get('/my', async (req, res, next) => {
  try {
    const records = await prisma.attendance.findMany({
      where: { userId: req.user.id },
      orderBy: { date: 'desc' },
      take: 30,
    });
    res.json({ success: true, data: records });
  } catch (err) { next(err); }
});

module.exports = router;
