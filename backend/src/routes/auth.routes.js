const router = require('express').Router();
const { loginWithEmail, loginWithPin, getPinUsers, logout, getMe, changePassword, changePin } = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { success: false, message: 'Too many login attempts' } });

router.post('/login', loginLimiter, loginWithEmail);
router.post('/pin-login', loginLimiter, loginWithPin);
router.get('/pin-users', getPinUsers);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
router.put('/change-password', authenticate, changePassword);
router.put('/change-pin', authenticate, changePin);

module.exports = router;
