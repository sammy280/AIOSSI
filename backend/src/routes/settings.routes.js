const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const prisma = require('../config/database');

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const settings = await prisma.systemSettings.findMany();
    const settingsMap = Object.fromEntries(settings.map(s => [s.key, s.value]));
    res.json({ success: true, data: settingsMap });
  } catch (err) { next(err); }
});

router.put('/', authorize('ADMIN'), async (req, res, next) => {
  try {
    const entries = Object.entries(req.body);
    await Promise.all(entries.map(([key, value]) =>
      prisma.systemSettings.upsert({ where: { key }, update: { value: String(value) }, create: { key, value: String(value) } })
    ));
    res.json({ success: true, message: 'Settings updated' });
  } catch (err) { next(err); }
});

module.exports = router;
