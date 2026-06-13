const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const prisma = require('../config/database');
const { createNotification } = require('../services/notification.service');

router.use(authenticate, authorize('ADMIN', 'MANAGER'));

router.get('/', async (req, res, next) => {
  try {
    const suppliers = await prisma.supplier.findMany({ include: { purchases: { orderBy: { createdAt: 'desc' }, take: 5 } }, orderBy: { name: 'asc' } });
    res.json({ success: true, data: suppliers });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const supplier = await prisma.supplier.create({ data: req.body });
    res.status(201).json({ success: true, data: supplier });
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const supplier = await prisma.supplier.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: supplier });
  } catch (err) { next(err); }
});

router.get('/purchases', async (req, res, next) => {
  try {
    const purchases = await prisma.purchase.findMany({ include: { supplier: true, purchaser: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: purchases });
  } catch (err) { next(err); }
});

router.post('/purchases', async (req, res, next) => {
  try {
    const { supplierId, product, quantity, unit, unitCost, isPaid, notes } = req.body;
    const totalCost = parseFloat(quantity) * parseFloat(unitCost);
    const purchase = await prisma.purchase.create({
      data: { supplierId, product, quantity: parseFloat(quantity), unit, unitCost: parseFloat(unitCost), totalCost, isPaid: isPaid || false, purchasedBy: req.user.id, notes },
      include: { supplier: true },
    });
    const io = req.app.get('io');
    await createNotification({ roles: ['ADMIN', 'MANAGER'], type: 'SUPPLIER_PURCHASE', title: 'New Purchase Recorded', message: `Purchase from ${purchase.supplier.name}: ${product} - ${totalCost.toLocaleString()} RWF`, data: { purchaseId: purchase.id }, io });
    res.status(201).json({ success: true, data: purchase });
  } catch (err) { next(err); }
});

module.exports = router;
