const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const prisma = require('../config/database');
const { createNotification } = require('../services/notification.service');
const { createAuditLog } = require('../middleware/audit');

router.use(authenticate);

router.get('/', authorize('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const fired = await prisma.firedEmployee.findMany({
      include: { employee: { select: { id: true, name: true } }, firedBy: { select: { id: true, name: true } } },
      orderBy: { firedAt: 'desc' },
    });
    res.json({ success: true, data: fired });
  } catch (err) { next(err); }
});

router.post('/', authorize('MANAGER'), async (req, res, next) => {
  try {
    const { employeeId, reason, notes } = req.body;
    const io = req.app.get('io');
    const employee = await prisma.user.findUnique({ where: { id: employeeId } });

    const [fired] = await prisma.$transaction([
      prisma.firedEmployee.create({ data: { employeeId, role: employee.role, reason, firedById: req.user.id, notes } }),
      prisma.user.update({ where: { id: employeeId }, data: { isActive: false } }),
      prisma.employeeProfile.update({ where: { userId: employeeId }, data: { status: 'FIRED' } }),
    ]);

    await createNotification({ roles: ['ADMIN'], type: 'EMPLOYEE_FIRED', title: 'Employee Fired', message: `${employee.name} has been fired by ${req.user.name}. Reason: ${reason}`, data: { employeeId }, io });
    await createAuditLog({ userId: req.user.id, role: req.user.role, action: 'FIRE_EMPLOYEE', description: `Fired ${employee.name}. Reason: ${reason}`, tableName: 'User', recordId: employeeId });

    res.status(201).json({ success: true, data: fired });
  } catch (err) { next(err); }
});

module.exports = router;
