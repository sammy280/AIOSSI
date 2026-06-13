const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const prisma = require('../config/database');

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const reservations = await prisma.reservation.findMany({ include: { table: true }, orderBy: { reservationDate: 'asc' } });
    res.json({ success: true, data: reservations });
  } catch (err) { next(err); }
});

router.post('/', authorize('ADMIN', 'MANAGER', 'CASHIER'), async (req, res, next) => {
  try {
    const reservation = await prisma.reservation.create({ data: { ...req.body, reservationDate: new Date(req.body.reservationDate) }, include: { table: true } });
    res.status(201).json({ success: true, data: reservation });
  } catch (err) { next(err); }
});

router.patch('/:id/status', authorize('ADMIN', 'MANAGER', 'CASHIER'), async (req, res, next) => {
  try {
    const reservation = await prisma.reservation.update({ where: { id: req.params.id }, data: { status: req.body.status } });
    res.json({ success: true, data: reservation });
  } catch (err) { next(err); }
});

module.exports = router;
