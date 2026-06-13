const router = require('express').Router();
const prisma = require('../config/database');
const jwt = require('jsonwebtoken');

const optionalCustomer = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    try { const d = jwt.verify(token, process.env.JWT_SECRET); if (d.type === 'customer') req.customer = await prisma.customer.findUnique({ where: { id: d.id } }); } catch {}
  }
  next();
};

router.get('/', async (req, res, next) => {
  try {
    const { type, productId } = req.query;
    const where = { isPublished: true };
    if (type) where.type = type;
    if (productId) where.productId = productId;
    const reviews = await prisma.review.findMany({ where, include: { customer: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' }, take: 50 });
    res.json({ success: true, data: reviews });
  } catch (err) { next(err); }
});

router.post('/', optionalCustomer, async (req, res, next) => {
  try {
    if (!req.customer) return res.status(401).json({ success: false, message: 'Login required to review' });
    const { productId, rating, comment, type } = req.body;
    const review = await prisma.review.create({ data: { customerId: req.customer.id, productId, rating, comment, type } });
    res.status(201).json({ success: true, data: review });
  } catch (err) { next(err); }
});

module.exports = router;
