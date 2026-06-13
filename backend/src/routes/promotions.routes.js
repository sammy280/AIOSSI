const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const prisma = require('../config/database');

router.use(authenticate, authorize('ADMIN', 'MANAGER'));

router.get('/', async (req, res, next) => {
  try {
    const promotions = await prisma.promotion.findMany({ orderBy: { startDate: 'desc' } });
    res.json({ success: true, data: promotions });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const promo = await prisma.promotion.create({ data: { ...req.body, startDate: new Date(req.body.startDate), endDate: new Date(req.body.endDate), value: parseFloat(req.body.value) } });
    res.status(201).json({ success: true, data: promo });
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const promo = await prisma.promotion.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: promo });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.promotion.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ success: true, message: 'Promotion deactivated' });
  } catch (err) { next(err); }
});

module.exports = router;
