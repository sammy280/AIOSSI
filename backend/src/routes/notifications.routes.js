const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const prisma = require('../config/database');

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const { date, type, unreadOnly } = req.query;
    const where = { userId: req.user.id };
    if (type) where.type = type;
    if (unreadOnly === 'true') where.isRead = false;
    if (date) {
      const d = new Date(date);
      where.createdAt = { gte: d, lt: new Date(d.getTime() + 86400000) };
    }
    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ success: true, data: notifications });
  } catch (err) { next(err); }
});

router.get('/unread-count', async (req, res, next) => {
  try {
    const count = await prisma.notification.count({ where: { userId: req.user.id, isRead: false } });
    res.json({ success: true, data: count });
  } catch (err) { next(err); }
});

router.patch('/:id/read', async (req, res, next) => {
  try {
    await prisma.notification.update({ where: { id: req.params.id, userId: req.user.id }, data: { isRead: true } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.patch('/read-all', async (req, res, next) => {
  try {
    await prisma.notification.updateMany({ where: { userId: req.user.id, isRead: false }, data: { isRead: true } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.notification.delete({ where: { id: req.params.id, userId: req.user.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
