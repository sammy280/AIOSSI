const prisma = require('../config/database');

/**
 * Create notifications for users or roles.
 * @param {Object} opts
 * @param {string[]} [opts.userIds] - specific user IDs
 * @param {string[]} [opts.roles] - role names to broadcast to
 * @param {string} opts.type
 * @param {string} opts.title
 * @param {string} opts.message
 * @param {object} [opts.data]
 * @param {object} opts.io - socket.io instance
 */
const createNotification = async ({ userIds = [], roles = [], type, title, message, data, io }) => {
  const targetUsers = [...userIds];

  if (roles.length > 0) {
    const roleUsers = await prisma.user.findMany({
      where: { role: { in: roles }, isActive: true },
      select: { id: true },
    });
    roleUsers.forEach(u => { if (!targetUsers.includes(u.id)) targetUsers.push(u.id); });
  }

  if (targetUsers.length === 0) return;

  const notifications = await prisma.notification.createManyAndReturn({
    data: targetUsers.map(userId => ({ userId, type, title, message, data })),
  });

  // Emit real-time via socket
  if (io) {
    targetUsers.forEach((userId, i) => {
      io.to(`user:${userId}`).emit('notification:new', notifications[i] || { userId, type, title, message, data, isRead: false, createdAt: new Date() });
    });
  }

  return notifications;
};

module.exports = { createNotification };
