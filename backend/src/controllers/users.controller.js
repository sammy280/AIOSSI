const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const { createAuditLog } = require('../middleware/audit');

const getUsers = async (req, res, next) => {
  try {
    const { role, status, search } = req.query;
    const where = {};
    if (role) where.role = role;
    if (search) where.name = { contains: search, mode: 'insensitive' };
    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;

    const users = await prisma.user.findMany({
      where,
      include: { profile: true },
      orderBy: { name: 'asc' },
    });
    const safe = users.map(({ passwordHash, pin, ...u }) => u);
    res.json({ success: true, data: safe });
  } catch (err) { next(err); }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { profile: { include: { documents: true } } },
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const { passwordHash, pin, ...safe } = user;
    res.json({ success: true, data: safe });
  } catch (err) { next(err); }
};

const createUser = async (req, res, next) => {
  try {
    const { name, email, password, pin, role, loginType, phone, address, nationalId, employmentDate, profilePicture } = req.body;

    const exists = email ? await prisma.user.findUnique({ where: { email: email.toLowerCase() } }) : null;
    if (exists) return res.status(409).json({ success: false, message: 'Email already in use' });

    const userData = {
      name,
      role,
      loginType,
      email: email ? email.toLowerCase() : null,
      passwordHash: password ? await bcrypt.hash(password, 12) : null,
      pin: pin ? await bcrypt.hash(String(pin), 12) : null,
    };

    const user = await prisma.user.create({
      data: {
        ...userData,
        profile: {
          create: {
            phone: phone || null,
            address: address || null,
            nationalId: nationalId || null,
            employmentDate: employmentDate ? new Date(employmentDate) : new Date(),
            profilePicture: profilePicture || null,
          },
        },
      },
      include: { profile: true },
    });

    await createAuditLog({
      userId: req.user.id, role: req.user.role,
      action: 'CREATE_USER', description: `Created user ${name} with role ${role}`,
      tableName: 'User', recordId: user.id, ipAddress: req.ip,
    });

    const { passwordHash, pin: pinHash, ...safe } = user;
    res.status(201).json({ success: true, data: safe, message: 'User created successfully' });
  } catch (err) { next(err); }
};

const updateUser = async (req, res, next) => {
  try {
    const { name, email, phone, address, nationalId, profilePicture, emergencyContact, emergencyPhone, role } = req.body;
    const userData = {
      name,
      email: email ? email.toLowerCase() : undefined,
      profile: {
        update: { phone, address, nationalId, profilePicture, emergencyContact, emergencyPhone },
      },
    };
    // Only ADMIN can change roles
    if (role && req.user.role === 'ADMIN') {
      userData.role = role;
    }
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: userData,
      include: { profile: true },
    });
    await createAuditLog({
      userId: req.user.id, role: req.user.role,
      action: 'UPDATE_USER',
      description: `Updated user ${user.name}${role ? ` (role changed to ${role})` : ''}`,
      tableName: 'User', recordId: user.id,
    });
    const { passwordHash, pin, ...safe } = user;
    res.json({ success: true, data: safe });
  } catch (err) { next(err); }
};

const deactivateUser = async (req, res, next) => {
  try {
    await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } });
    await createAuditLog({ userId: req.user.id, role: req.user.role, action: 'DEACTIVATE_USER', description: `Deactivated user ${req.params.id}`, ipAddress: req.ip });
    res.json({ success: true, message: 'User deactivated' });
  } catch (err) { next(err); }
};

const reactivateUser = async (req, res, next) => {
  try {
    await prisma.user.update({ where: { id: req.params.id }, data: { isActive: true, failedAttempts: 0, lockedUntil: null } });
    await createAuditLog({ userId: req.user.id, role: req.user.role, action: 'REACTIVATE_USER', description: `Reactivated user ${req.params.id}`, ipAddress: req.ip });
    res.json({ success: true, message: 'User reactivated' });
  } catch (err) { next(err); }
};

const resetPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    const hash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: req.params.id }, data: { passwordHash: hash, failedAttempts: 0, lockedUntil: null } });
    await createAuditLog({ userId: req.user.id, role: req.user.role, action: 'RESET_PASSWORD', description: `Reset password for user ${req.params.id}`, ipAddress: req.ip });
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) { next(err); }
};

const resetPin = async (req, res, next) => {
  try {
    const { newPin } = req.body;
    const hash = await bcrypt.hash(String(newPin), 12);
    await prisma.user.update({ where: { id: req.params.id }, data: { pin: hash, failedAttempts: 0, lockedUntil: null } });
    await createAuditLog({ userId: req.user.id, role: req.user.role, action: 'RESET_PIN', description: `Reset PIN for user ${req.params.id}`, ipAddress: req.ip });
    res.json({ success: true, message: 'PIN reset successfully' });
  } catch (err) { next(err); }
};

module.exports = { getUsers, getUserById, createUser, updateUser, deactivateUser, reactivateUser, resetPassword, resetPin };
