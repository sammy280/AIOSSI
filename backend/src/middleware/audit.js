const prisma = require('../config/database');

const createAuditLog = async ({ userId, role, action, description, tableName, recordId, oldValues, newValues, ipAddress }) => {
  try {
    await prisma.auditLog.create({
      data: { userId, role, action, description, tableName, recordId, oldValues, newValues, ipAddress },
    });
  } catch (err) {
    console.error('Audit log error:', err);
  }
};

const auditMiddleware = (action, description) => async (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = function (data) {
    if (data.success !== false && req.user) {
      createAuditLog({
        userId: req.user.id,
        role: req.user.role,
        action,
        description: typeof description === 'function' ? description(req, data) : description,
        ipAddress: req.ip,
      });
    }
    return originalJson(data);
  };
  next();
};

module.exports = { createAuditLog, auditMiddleware };
