const router = require('express').Router();
const ctrl = require('../controllers/users.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadImage } = require('../middleware/upload');
const prisma = require('../config/database');
const path = require('path');

router.use(authenticate);

router.get('/', authorize('ADMIN', 'MANAGER'), ctrl.getUsers);
router.get('/:id', authorize('ADMIN', 'MANAGER'), ctrl.getUserById);
router.post('/', authorize('ADMIN'), ctrl.createUser);
router.put('/:id', authorize('ADMIN', 'MANAGER'), ctrl.updateUser);
router.patch('/:id/deactivate', authorize('ADMIN'), ctrl.deactivateUser);
router.patch('/:id/reactivate', authorize('ADMIN'), ctrl.reactivateUser);
router.patch('/:id/reset-password', authorize('ADMIN'), ctrl.resetPassword);
router.patch('/:id/reset-pin', authorize('ADMIN'), ctrl.resetPin);

// Upload / update staff avatar — admin & manager can do this for non-admin staff
router.post('/:id/avatar', authorize('ADMIN', 'MANAGER'), uploadImage.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No image uploaded' });
    const profile = await prisma.employeeProfile.upsert({
      where: { userId: req.params.id },
      update: { avatar: req.file.filename },
      create: { userId: req.params.id, avatar: req.file.filename, employmentDate: new Date() },
    });
    res.json({ success: true, data: { avatar: req.file.filename } });
  } catch (err) { next(err); }
});

module.exports = router;
