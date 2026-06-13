const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const prisma = require('../config/database');
const { createNotification } = require('../services/notification.service');
const { createAuditLog } = require('../middleware/audit');

router.use(authenticate);

router.get('/', authorize('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const requests = await prisma.deleteRequest.findMany({ include: { requester: { select: { id: true, name: true } }, approver: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: requests });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { tableName, recordId, reason } = req.body;
    const io = req.app.get('io');
    const request = await prisma.deleteRequest.create({ data: { tableName, recordId, reason, requestedBy: req.user.id } });
    await createNotification({ roles: ['ADMIN', 'MANAGER'], type: 'DELETE_REQUEST', title: 'Delete Request', message: `${req.user.name} requested deletion of ${tableName} record. Reason: ${reason}`, data: { requestId: request.id }, io });
    res.status(201).json({ success: true, data: request });
  } catch (err) { next(err); }
});

router.patch('/:id/approve', authorize('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const request = await prisma.deleteRequest.update({ where: { id: req.params.id }, data: { status: 'APPROVED', approvedBy: req.user.id, approvedAt: new Date() } });
    await createAuditLog({ userId: req.user.id, role: req.user.role, action: 'APPROVE_DELETE', description: `Approved delete request for ${request.tableName}` });
    res.json({ success: true, data: request });
  } catch (err) { next(err); }
});

router.patch('/:id/reject', authorize('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const request = await prisma.deleteRequest.update({ where: { id: req.params.id }, data: { status: 'REJECTED', approvedBy: req.user.id, approvedAt: new Date(), rejectionReason: req.body.reason } });
    res.json({ success: true, data: request });
  } catch (err) { next(err); }
});

module.exports = router;
