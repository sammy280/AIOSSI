const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../config/database');
const { createAuditLog } = require('../middleware/audit');

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

const generateTokens = (user) => {
  const payload = { id: user.id, role: user.role, name: user.name };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
  return token;
};

const loginWithEmail = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { profile: true },
    });

    if (!user || !['EMAIL_PASSWORD'].includes(user.loginType)) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account deactivated' });
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remaining = Math.ceil((user.lockedUntil - new Date()) / 60000);
      return res.status(423).json({ success: false, message: `Account locked. Try again in ${remaining} minutes.` });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      const attempts = user.failedAttempts + 1;
      const updateData = { failedAttempts: attempts };
      if (attempts >= MAX_FAILED_ATTEMPTS) {
        updateData.lockedUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);
      }
      await prisma.user.update({ where: { id: user.id }, data: updateData });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Reset failed attempts
    await prisma.user.update({ where: { id: user.id }, data: { failedAttempts: 0, lockedUntil: null, lastLogin: new Date() } });

    const token = generateTokens(user);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.session.create({
      data: { userId: user.id, token, expiresAt, ipAddress: req.ip, userAgent: req.get('user-agent') },
    });

    await createAuditLog({ userId: user.id, role: user.role, action: 'LOGIN', description: `${user.name} logged in`, ipAddress: req.ip });

    const { passwordHash, pin, ...safeUser } = user;
    res.json({ success: true, data: { token, user: safeUser } });
  } catch (err) {
    next(err);
  }
};

const loginWithPin = async (req, res, next) => {
  try {
    const { pin, userId } = req.body;
    if (!pin || !userId) {
      return res.status(400).json({ success: false, message: 'User ID and PIN required' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });

    if (!user || user.loginType !== 'PIN') {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account deactivated' });
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return res.status(423).json({ success: false, message: 'Account temporarily locked' });
    }

    const valid = await bcrypt.compare(pin, user.pin);
    if (!valid) {
      const attempts = user.failedAttempts + 1;
      const updateData = { failedAttempts: attempts };
      if (attempts >= MAX_FAILED_ATTEMPTS) {
        updateData.lockedUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);
      }
      await prisma.user.update({ where: { id: user.id }, data: updateData });
      return res.status(401).json({ success: false, message: 'Invalid PIN' });
    }

    await prisma.user.update({ where: { id: user.id }, data: { failedAttempts: 0, lockedUntil: null, lastLogin: new Date() } });

    const token = generateTokens(user);
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours for PIN users

    await prisma.session.create({
      data: { userId: user.id, token, expiresAt, ipAddress: req.ip, userAgent: req.get('user-agent') },
    });

    await createAuditLog({ userId: user.id, role: user.role, action: 'PIN_LOGIN', description: `${user.name} logged in via PIN`, ipAddress: req.ip });

    const { passwordHash, pin: pinHash, ...safeUser } = user;
    res.json({ success: true, data: { token, user: safeUser } });
  } catch (err) {
    next(err);
  }
};

const getPinUsers = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { loginType: 'PIN', isActive: true },
      select: { id: true, name: true, role: true, profile: { select: { profilePicture: true } } },
      orderBy: { role: 'asc' },
    });
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    await prisma.session.deleteMany({ where: { token: req.token } });
    await createAuditLog({ userId: req.user.id, role: req.user.role, action: 'LOGOUT', description: `${req.user.name} logged out`, ipAddress: req.ip });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { profile: true },
    });
    const { passwordHash, pin, ...safeUser } = user;
    res.json({ success: true, data: safeUser });
  } catch (err) {
    next(err);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return res.status(400).json({ success: false, message: 'Current password incorrect' });
    const hash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash: hash } });
    res.json({ success: true, message: 'Password updated' });
  } catch (err) {
    next(err);
  }
};

const changePin = async (req, res, next) => {
  try {
    const { currentPin, newPin } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const valid = await bcrypt.compare(currentPin, user.pin);
    if (!valid) return res.status(400).json({ success: false, message: 'Current PIN incorrect' });
    const hash = await bcrypt.hash(newPin, 12);
    await prisma.user.update({ where: { id: req.user.id }, data: { pin: hash } });
    res.json({ success: true, message: 'PIN updated' });
  } catch (err) {
    next(err);
  }
};

module.exports = { loginWithEmail, loginWithPin, getPinUsers, logout, getMe, changePassword, changePin };
