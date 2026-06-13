const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const prisma = require('../config/database');

router.use(authenticate, authorize('ADMIN'));

router.get('/', async (req, res, next) => {
  try {
    const backups = await prisma.backup.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: backups });
  } catch (err) { next(err); }
});

router.post('/create', async (req, res, next) => {
  try {
    const backupDir = path.join(__dirname, '../../backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    const filename = `backup_${Date.now()}.sql`;
    const filepath = path.join(backupDir, filename);
    const dbUrl = process.env.DATABASE_URL;
    const match = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    if (!match) return res.status(400).json({ success: false, message: 'Invalid database URL' });
    const [, user, pass, host, port, db] = match;
    const cmd = `PGPASSWORD=${pass} pg_dump -h ${host} -p ${port} -U ${user} -d ${db} -f ${filepath}`;
    exec(cmd, async (err) => {
      if (err) return next(new Error('Backup failed: ' + err.message));
      const stats = fs.statSync(filepath);
      const backup = await prisma.backup.create({ data: { filename, size: stats.size, createdBy: req.user.id } });
      res.json({ success: true, data: backup });
    });
  } catch (err) { next(err); }
});

module.exports = router;
