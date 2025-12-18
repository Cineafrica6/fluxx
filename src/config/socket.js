const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

// Import socket handlers
const setupSignaling = require('../sockets/signaling');
const setupMatchmaking = require('../sockets/matchmaking');
const setupChat = require('../sockets/chat');

let io;

const initializeSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: true, // Allow all origins for testing
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Authentication middleware for Socket.IO
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`✅ User connected: ${socket.userId} (Socket: ${socket.id})`);

    // Setup socket handlers
    setupSignaling(io, socket);
    setupMatchmaking(io, socket);
    setupChat(io, socket);

    socket.on('disconnect', (reason) => {
      logger.info(`👋 User disconnected: ${socket.userId} (Reason: ${reason})`);
    });

    socket.on('error', (error) => {
      logger.error(`Socket error for ${socket.userId}:`, error);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

module.exports = { initializeSocket, getIO };