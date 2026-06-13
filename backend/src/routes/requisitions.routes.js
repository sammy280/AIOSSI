const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const prisma = require('../config/database');
const { createNotification } = require('../services/notification.service');
const { createAuditLog } = require('../middleware/audit');

router.use(authenticate);

// List requisitions (filtered by role)
router.get('/', async (req, res, next) => {
  try {
    const { status, category } = req.query;
    const where = {};
    if (status) where.status = status;
    if (category) where.category = category;
    // Kitchen/Bar staff only see their own; manager/admin/storekeeper see all
    if (['KITCHEN', 'BAR', 'WAITER'].includes(req.user.role)) {
      where.requestedById = req.user.id;
    }

    const requisitions = await prisma.requisition.findMany({
      where,
      include: {
        items: true,
        requestedBy: { select: { id: true, name: true, role: true } },
        reviewedBy: { select: { id: true, name: true } },
        purchaseOrder: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: requisitions });
  } catch (err) { next(err); }
});

// Create requisition (kitchen/bar/waiter)
router.post('/', async (req, res, next) => {
  try {
    const { title, category, items, notes, urgency } = req.body;
    const io = req.app.get('io');

    const req_ = await prisma.requisition.create({
      data: {
        title, category, notes, urgency: urgency || 'NORMAL',
        requestedById: req.user.id,
        items: { create: items.map(i => ({ name: i.name, quantity: parseFloat(i.quantity), unit: i.unit || 'unit', estimatedCost: i.estimatedCost ? parseFloat(i.estimatedCost) : undefined, notes: i.notes })) },
      },
      include: { items: true, requestedBy: { select: { id: true, name: true, role: true } } },
    });

    await createNotification({
      roles: ['MANAGER', 'ADMIN'],
      type: 'REQUISITION',
      title: `📋 New Requisition — ${category}`,
      message: `${req.user.name} submitted a ${urgency || 'NORMAL'} priority requisition: "${title}"`,
      data: { requisitionId: req_.id },
      io,
    });

    await createAuditLog({ userId: req.user.id, role: req.user.role, action: 'CREATE_REQUISITION', description: `Created requisition: ${title}`, tableName: 'Requisition', recordId: req_.id });

    res.status(201).json({ success: true, data: req_ });
  } catch (err) { next(err); }
});

// Approve or reject (manager/admin)
router.patch('/:id/review', authorize('MANAGER', 'ADMIN'), async (req, res, next) => {
  try {
    const { status, reviewNote } = req.body; // APPROVED or REJECTED
    const io = req.app.get('io');

    const existing = await prisma.requisition.findUnique({ where: { id: req.params.id }, include: { requestedBy: true } });
    if (!existing) return res.status(404).json({ success: false, message: 'Not found' });

    const updated = await prisma.requisition.update({
      where: { id: req.params.id },
      data: { status, reviewedById: req.user.id, reviewNote, reviewedAt: new Date() },
    });

    await createNotification({
      userIds: [existing.requestedById],
      type: 'REQUISITION',
      title: status === 'APPROVED' ? '✅ Requisition Approved' : '❌ Requisition Rejected',
      message: status === 'APPROVED'
        ? `Your requisition "${existing.title}" has been approved by ${req.user.name}`
        : `Your requisition "${existing.title}" was rejected. ${reviewNote || ''}`,
      data: { requisitionId: existing.id },
      io,
    });

    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

// Create purchase order for approved requisition (storekeeper/manager/admin)
router.post('/:id/purchase-order', authorize('MANAGER', 'ADMIN'), async (req, res, next) => {
  try {
    const { supplier, totalCost, notes } = req.body;

    const requisition = await prisma.requisition.findUnique({
      where: { id: req.params.id },
      include: { requestedBy: true },
    });
    if (!requisition) return res.status(404).json({ success: false, message: 'Not found' });
    if (requisition.status !== 'APPROVED') return res.status(400).json({ success: false, message: 'Requisition must be approved first' });

    const po = await prisma.purchaseOrder.create({
      data: {
        requisitionId: req.params.id,
        supplier, totalCost: parseFloat(totalCost || 0), notes,
        createdById: req.user.id,
      },
    });

    await prisma.requisition.update({ where: { id: req.params.id }, data: { status: 'PURCHASED' } });

    res.status(201).json({ success: true, data: po });
  } catch (err) { next(err); }
});

// Mark delivered
router.patch('/:id/deliver', authorize('MANAGER', 'ADMIN'), async (req, res, next) => {
  try {
    const updated = await prisma.requisition.update({
      where: { id: req.params.id },
      data: { status: 'DELIVERED' },
    });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

// Reports: summary by category, status
router.get('/reports', authorize('MANAGER', 'ADMIN'), async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const where = {};
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [all, byStatus, byCategory, totalPurchaseCost] = await Promise.all([
      prisma.requisition.count({ where }),
      prisma.requisition.groupBy({ by: ['status'], where, _count: true }),
      prisma.requisition.groupBy({ by: ['category'], where, _count: true }),
      prisma.purchaseOrder.aggregate({ _sum: { totalCost: true } }),
    ]);

    res.json({
      success: true,
      data: {
        total: all,
        byStatus: Object.fromEntries(byStatus.map(r => [r.status, r._count])),
        byCategory: Object.fromEntries(byCategory.map(r => [r.category, r._count])),
        totalPurchaseCost: parseFloat(totalPurchaseCost._sum.totalCost || 0),
      },
    });
  } catch (err) { next(err); }
});

module.exports = router;
