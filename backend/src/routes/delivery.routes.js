const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const prisma = require('../config/database');
const jwt = require('jsonwebtoken');

// Rider auth middleware
const riderAuth = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Token required' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (req.user?.role !== 'DELIVERY_RIDER') return res.status(403).json({ success: false, message: 'Rider access only' });
    next();
  } catch { res.status(401).json({ success: false, message: 'Invalid token' }); }
};

router.get('/my', riderAuth, async (req, res, next) => {
  try {
    const deliveries = await prisma.delivery.findMany({
      where: { riderId: req.user.id },
      include: { order: { include: { items: { include: { product: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: deliveries });
  } catch (err) { next(err); }
});

router.patch('/:id/pickup', riderAuth, async (req, res, next) => {
  try {
    const delivery = await prisma.delivery.update({
      where: { id: req.params.id, riderId: req.user.id },
      data: { pickedUpAt: new Date() },
    });
    await prisma.onlineOrder.update({ where: { id: delivery.orderId }, data: { status: 'OUT_FOR_DELIVERY' } });
    const io = req.app.get('io');
    io.emit('delivery:pickup', delivery);
    res.json({ success: true, data: delivery });
  } catch (err) { next(err); }
});

router.patch('/:id/delivered', riderAuth, async (req, res, next) => {
  try {
    const delivery = await prisma.delivery.update({
      where: { id: req.params.id, riderId: req.user.id },
      data: { deliveredAt: new Date() },
    });
    await prisma.onlineOrder.update({ where: { id: delivery.orderId }, data: { status: 'DELIVERED', isPaid: true } });
    const io = req.app.get('io');
    io.emit('delivery:delivered', delivery);
    res.json({ success: true, data: delivery });
  } catch (err) { next(err); }
});

// Manager assigns rider
router.use(authenticate);
router.get('/', authorize('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const deliveries = await prisma.delivery.findMany({
      include: { order: true, rider: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: deliveries });
  } catch (err) { next(err); }
});

router.patch('/:id/assign', authorize('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { riderId } = req.body;
    const delivery = await prisma.delivery.update({ where: { id: req.params.id }, data: { riderId } });
    await prisma.onlineOrder.update({ where: { id: delivery.orderId }, data: { status: 'ACCEPTED' } });
    res.json({ success: true, data: delivery });
  } catch (err) { next(err); }
});

module.exports = router;
