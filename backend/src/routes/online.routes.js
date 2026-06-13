const router = require('express').Router();
const prisma = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createNotification } = require('../services/notification.service');

// Customer auth
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;
    const existing = await prisma.customer.findFirst({ where: { OR: [email ? { email } : {}, phone ? { phone } : {}].filter(o => Object.keys(o).length > 0) } });
    if (existing) return res.status(409).json({ success: false, message: 'Account already exists' });
    const customer = await prisma.customer.create({ data: { name, email, phone, passwordHash: password ? await bcrypt.hash(password, 12) : null, isVerified: true } });
    const token = jwt.sign({ id: customer.id, type: 'customer' }, process.env.JWT_SECRET, { expiresIn: '30d' });
    const { passwordHash, ...safe } = customer;
    res.status(201).json({ success: true, data: { token, customer: safe } });
  } catch (err) { next(err); }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, phone, password } = req.body;
    const customer = await prisma.customer.findFirst({ where: email ? { email } : { phone } });
    if (!customer || !customer.passwordHash) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, customer.passwordHash);
    if (!valid) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    await prisma.customer.update({ where: { id: customer.id }, data: { lastVisit: new Date() } });
    const token = jwt.sign({ id: customer.id, type: 'customer' }, process.env.JWT_SECRET, { expiresIn: '30d' });
    const { passwordHash, ...safe } = customer;
    res.json({ success: true, data: { token, customer: safe } });
  } catch (err) { next(err); }
});

// Customer middleware
const customerAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return next(); // allow guest
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
    if (decoded.type === 'customer') {
      req.customer = await prisma.customer.findUnique({ where: { id: decoded.id } });
    }
  } catch {}
  next();
};

// Menu for online store — categories with nested products
router.get('/menu', async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      include: { products: { where: { isAvailable: true }, orderBy: { name: 'asc' } } },
      orderBy: { type: 'asc' },
    });
    res.json({ success: true, data: categories });
  } catch (err) { next(err); }
});

// Categories list only (no nested products)
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({ where: { isActive: true }, orderBy: { type: 'asc' } });
    res.json({ success: true, data: categories });
  } catch (err) { next(err); }
});

// Flat list of all available products (with category info)
router.get('/products', async (req, res, next) => {
  try {
    const { categoryId, type, search } = req.query;
    const where = { isAvailable: true };
    if (categoryId) where.categoryId = categoryId;
    if (type) where.category = { type };
    if (search) where.name = { contains: search, mode: 'insensitive' };
    const products = await prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: products });
  } catch (err) { next(err); }
});

router.get('/featured', async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({ where: { isFeatured: true, isAvailable: true }, include: { category: true }, take: 8 });
    res.json({ success: true, data: products });
  } catch (err) { next(err); }
});

router.get('/promotions', async (req, res, next) => {
  try {
    const now = new Date();
    const promotions = await prisma.promotion.findMany({ where: { isActive: true, startDate: { lte: now }, endDate: { gte: now } } });
    res.json({ success: true, data: promotions });
  } catch (err) { next(err); }
});

router.get('/reviews', async (req, res, next) => {
  try {
    const reviews = await prisma.review.findMany({ where: { isPublished: true, type: 'OVERALL' }, include: { customer: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' }, take: 20 });
    res.json({ success: true, data: reviews });
  } catch (err) { next(err); }
});

// Create online order
router.post('/orders', customerAuth, async (req, res, next) => {
  try {
    const { items, deliveryType, deliveryAddress, guestName, guestPhone, guestEmail, notes, paymentMethod, promoCode, loyaltyPointsToUse } = req.body;
    const io = req.app.get('io');

    const productIds = items.map(i => i.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
    const productMap = Object.fromEntries(products.map(p => [p.id, p]));

    let subtotal = items.reduce((sum, item) => sum + (parseFloat(productMap[item.productId].price) * item.quantity), 0);
    const deliveryFee = deliveryType === 'DELIVERY' ? parseFloat(process.env.DELIVERY_FEE || '1000') : 0;
    let discount = 0;

    // Apply promo code
    let promotion = null;
    if (promoCode) {
      promotion = await prisma.promotion.findFirst({ where: { code: promoCode, isActive: true, startDate: { lte: new Date() }, endDate: { gte: new Date() } } });
      if (promotion) {
        if (promotion.type === 'PERCENTAGE') discount = subtotal * (parseFloat(promotion.value) / 100);
        else if (promotion.type === 'FIXED') discount = parseFloat(promotion.value);
        if (promotion.maxDiscount) discount = Math.min(discount, parseFloat(promotion.maxDiscount));
      }
    }

    // Loyalty points discount
    let pointsUsed = 0;
    if (loyaltyPointsToUse && req.customer) {
      pointsUsed = Math.min(loyaltyPointsToUse, req.customer.loyaltyPoints);
      discount += pointsUsed; // 1 point = 1 RWF
    }

    const total = subtotal + deliveryFee - discount;

    const orderNum = `ONL-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    const pointsEarned = Math.floor(subtotal / (parseFloat(process.env.LOYALTY_RATE || '1000')));

    const order = await prisma.onlineOrder.create({
      data: {
        orderNumber: orderNum,
        customerId: req.customer?.id || null,
        guestName, guestPhone, guestEmail,
        deliveryType, deliveryAddress, notes,
        subtotal, deliveryFee, discount, total,
        paymentMethod: paymentMethod || 'CASH',
        promotionId: promotion?.id || null,
        loyaltyPointsEarned: pointsEarned,
        loyaltyPointsUsed: pointsUsed,
        items: { create: items.map(item => ({ productId: item.productId, quantity: item.quantity, unitPrice: productMap[item.productId].price, notes: item.notes })) },
        delivery: deliveryType === 'DELIVERY' ? { create: {} } : undefined,
      },
      include: { items: { include: { product: true } } },
    });

    // Update customer stats
    if (req.customer) {
      await prisma.customer.update({
        where: { id: req.customer.id },
        data: { loyaltyPoints: { increment: pointsEarned - pointsUsed }, totalSpent: { increment: total }, lastVisit: new Date() },
      });
    }

    // Notify admins and manager
    await createNotification({ roles: ['ADMIN', 'MANAGER', 'CASHIER'], type: 'ONLINE_ORDER', title: 'New Online Order', message: `New online order #${orderNum} - ${total.toLocaleString()} RWF (${paymentMethod})`, data: { orderId: order.id }, io });

    res.status(201).json({ success: true, data: order });
  } catch (err) { next(err); }
});

// ── CASHIER confirms payment → kitchen + bar get notified ──────────────────
const { authenticate, authorize } = require('../middleware/auth');

router.patch('/orders/:id/confirm-payment', authenticate, authorize('CASHIER', 'ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const order = await prisma.onlineOrder.findUnique({
      where: { id: req.params.id },
      include: { items: { include: { product: { include: { category: true } } } } },
    });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.isPaid) return res.status(409).json({ success: false, message: 'Payment already confirmed' });

    // Mark paid + advance status
    await prisma.onlineOrder.update({
      where: { id: order.id },
      data: { isPaid: true, status: 'ACCEPTED' },
    });

    // Separate food vs drink items
    const foodItems = order.items.filter(i => i.product.category?.type === 'FOOD');
    const drinkItems = order.items.filter(i => i.product.category?.type === 'DRINK');

    // Notify kitchen if food items exist
    if (foodItems.length > 0) {
      await createNotification({
        roles: ['KITCHEN'],
        type: 'ORDER_UPDATE',
        title: `🍽️ Online Order #${order.orderNumber}`,
        message: `New online food order — ${foodItems.length} item(s). Start preparing!`,
        data: { orderId: order.id },
        io,
      });
    }

    // Notify bar if drink items exist
    if (drinkItems.length > 0) {
      await createNotification({
        roles: ['BAR'],
        type: 'ORDER_UPDATE',
        title: `🍺 Online Order #${order.orderNumber}`,
        message: `New online drink order — ${drinkItems.length} item(s). Start preparing!`,
        data: { orderId: order.id },
        io,
      });
    }

    // Notify customer via socket if connected
    io?.to(`online_order:${order.id}`).emit('order:status', { status: 'ACCEPTED', message: 'Payment confirmed — your order is being prepared!' });

    res.json({ success: true, message: 'Payment confirmed. Kitchen & bar notified.' });
  } catch (err) { next(err); }
});

// ── Staff: update online order status ──────────────────────────────────────
router.patch('/orders/:id/status', authenticate, authorize('CASHIER', 'ADMIN', 'MANAGER', 'KITCHEN', 'BAR'), async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const { status } = req.body;
    const order = await prisma.onlineOrder.update({
      where: { id: req.params.id },
      data: { status },
    });
    // Notify customer
    io?.to(`online_order:${order.id}`).emit('order:status', { status, message: `Your order status: ${status}` });
    res.json({ success: true, data: order });
  } catch (err) { next(err); }
});

// ── Get all online orders (staff view) ─────────────────────────────────────
router.get('/all-orders', authenticate, authorize('CASHIER', 'ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};
    const orders = await prisma.onlineOrder.findMany({
      where,
      include: { items: { include: { product: true } }, customer: { select: { id: true, name: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ success: true, data: orders });
  } catch (err) { next(err); }
});

router.get('/orders/:id/track', async (req, res, next) => {
  try {
    const order = await prisma.onlineOrder.findUnique({
      where: { id: req.params.id },
      include: { items: { include: { product: true } }, delivery: { include: { rider: { select: { id: true, name: true } } } } },
    });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, data: order });
  } catch (err) { next(err); }
});

// Customer profile & history (requires auth)
router.get('/profile', customerAuth, async (req, res, next) => {
  try {
    if (!req.customer) return res.status(401).json({ success: false, message: 'Login required' });
    const { passwordHash, ...safe } = req.customer;
    res.json({ success: true, data: safe });
  } catch (err) { next(err); }
});

router.get('/orders', customerAuth, async (req, res, next) => {
  try {
    if (!req.customer) return res.status(401).json({ success: false, message: 'Login required' });
    const orders = await prisma.onlineOrder.findMany({
      where: { customerId: req.customer.id },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: orders });
  } catch (err) { next(err); }
});

// Alias for frontend compatibility
router.get('/my-orders', customerAuth, async (req, res, next) => {
  try {
    if (!req.customer) return res.status(401).json({ success: false, message: 'Login required' });
    const orders = await prisma.onlineOrder.findMany({
      where: { customerId: req.customer.id },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: orders });
  } catch (err) { next(err); }
});

module.exports = router;
