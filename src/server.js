require('dotenv').config();
const http = require('http');
const app = require('./app');
const { connectDB } = require('./config/database');
const { validateEnv } = require('./config/env');
const { initializeSocket } = require('./config/socket');
const matchmakingService = require('./services/matchmakingService');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

// Validate environment variables
try {
  validateEnv();
} catch (error) {
  logger.error('Environment validation failed:', error.message);
  process.exit(1);
}

const server = http.createServer(app);

// Initialize Socket.IO
initializeSocket(server);

// Periodic cleanup of stale queue entries (every 5 minutes)
setInterval(() => {
  matchmakingService.cleanStaleQueueEntries();
}, 5 * 60 * 1000);

// Connect to MongoDB and start server
connectDB()
  .then(() => {
    server.listen(PORT, () => {
      logger.success(`🚀 Fluxx Server running on port ${PORT}`);
      logger.info(`📡 WebSocket server ready`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV}`);
      logger.info(`🔗 Frontend URL: ${process.env.FRONTEND_URL}`);
    });
  })
  .catch((error) => {
    logger.error('Failed to start server:', error);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});