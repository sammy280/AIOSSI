const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { logger } = require('../utils/logger');

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [
        process.env.FRONTEND_URL || 'http://localhost:5173',
        process.env.ONLINE_STORE_URL || 'http://localhost:5174',
      ],
      credentials: true,
    },
    pingTimeout: 60000,
  });

  // Auth middleware for socket — allow unauthenticated for online store customers
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      // Allow unauthenticated — they can only join online_order rooms
      socket.user = { id: null, role: 'GUEST' };
      return next();
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { id: userId, role } = socket.user;
    if (userId) {
      logger.info(`Socket connected: ${userId} (${role})`);
      // Join user-specific room and role room
      socket.join(`user:${userId}`);
      socket.join(`role:${role}`);
    }

    socket.on('join:table', (tableId) => socket.join(`table:${tableId}`));
    socket.on('leave:table', (tableId) => socket.leave(`table:${tableId}`));

    // Online store order tracking rooms (unauthenticated allowed)
    socket.on('join:online_order', (orderId) => socket.join(`online_order:${orderId}`));
    socket.on('leave:online_order', (orderId) => socket.leave(`online_order:${orderId}`));

    socket.on('disconnect', () => {
      if (userId) logger.info(`Socket disconnected: ${userId}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

// Emit to specific user
const emitToUser = (userId, event, data) => {
  getIO().to(`user:${userId}`).emit(event, data);
};

// Emit to role group
const emitToRole = (role, event, data) => {
  getIO().to(`role:${role}`).emit(event, data);
};

// Emit to multiple roles
const emitToRoles = (roles, event, data) => {
  roles.forEach(role => emitToRole(role, event, data));
};

// Broadcast to all
const broadcast = (event, data) => {
  getIO().emit(event, data);
};

module.exports = { initSocket, getIO, emitToUser, emitToRole, emitToRoles, broadcast };
