const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const prisma = require('../config/database');
const { createNotification } = require('../services/notification.service');
const { createAuditLog } = require('../middleware/audit');

router.use(authenticate);

router.get('/', authorize('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const punishments = await prisma.punishment.findMany({
      include: { employee: { select: { id: true, name: true, role: true } }, submitter: { select: { id: true, name: true } }, approver: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: punishments });
  } catch (err) { next(err); }
});

router.post('/', authorize('MANAGER'), async (req, res, next) => {
  try {
    const { employeeId, reason, type, amount } = req.body;
    const io = req.app.get('io');
    const punishment = await prisma.punishment.create({
      data: { employeeId, submittedBy: req.user.id, reason, type, amount: amount ? parseFloat(amount) : null },
      include: { employee: { select: { id: true, name: true, role: true } } },
    });
    await createNotification({ roles: ['ADMIN'], type: 'PUNISHMENT_REQUEST', title: 'Punishment Approval Required', message: `${req.user.name} submitted a ${type} for ${punishment.employee.name}. Reason: ${reason}`, data: { punishmentId: punishment.id }, io });
    res.status(201).json({ success: true, data: punishment });
  } catch (err) { next(err); }
});

router.patch('/:id/approve', authorize('ADMIN'), async (req, res, next) => {
  try {
    const punishment = await prisma.punishment.update({ where: { id: req.params.id }, data: { status: 'APPROVED', approvedBy: req.user.id, approvedAt: new Date() }, include: { employee: { select: { id: true, name: true } } } });
    await createAuditLog({ userId: req.user.id, role: req.user.role, action: 'APPROVE_PUNISHMENT', description: `Approved punishment for ${punishment.employee.name}` });
    res.json({ success: true, data: punishment });
  } catch (err) { next(err); }
});

router.patch('/:id/reject', authorize('ADMIN'), async (req, res, next) => {
  try {
    const { rejectionReason } = req.body;
    const punishment = await prisma.punishment.update({ where: { id: req.params.id }, data: { status: 'REJECTED', approvedBy: req.user.id, approvedAt: new Date(), rejectionReason } });
    res.json({ success: true, data: punishment });
  } catch (err) { next(err); }
});

module.exports = router;
