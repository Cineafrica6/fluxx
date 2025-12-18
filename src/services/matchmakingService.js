const logger = require('../utils/logger');

class MatchmakingService {
  constructor() {
    this.queue = []; // Array of { userId, socketId, joinedAt }
    this.activeMatches = new Map(); // userId -> { partnerId, roomId, socketId }
    this.userSockets = new Map(); // userId -> socketId mapping
  }

  addToQueue(userId, socketId) {
    // Remove if already in queue
    this.removeFromQueue(userId);
    
    this.queue.push({ 
      userId, 
      socketId, 
      joinedAt: Date.now() 
    });
    
    this.userSockets.set(userId, socketId);
    
    logger.info(`✅ User ${userId} joined queue. Queue size: ${this.queue.length}`);
    
    return this.queue.length;
  }

  removeFromQueue(userId) {
    const index = this.queue.findIndex(user => user.userId === userId);
    if (index !== -1) {
      this.queue.splice(index, 1);
      logger.info(`❌ User ${userId} removed from queue. Queue size: ${this.queue.length}`);
      return true;
    }
    return false;
  }

  findMatch() {
    if (this.queue.length < 2) {
      return null;
    }

    // Random matching: pick two random users
    const index1 = Math.floor(Math.random() * this.queue.length);
    const user1 = this.queue.splice(index1, 1)[0];
    
    const index2 = Math.floor(Math.random() * this.queue.length);
    const user2 = this.queue.splice(index2, 1)[0];

    const roomId = `room_${user1.userId}_${user2.userId}_${Date.now()}`;

    // Store active match
    this.activeMatches.set(user1.userId, { 
      partnerId: user2.userId, 
      roomId,
      socketId: user1.socketId,
      startedAt: Date.now()
    });
    
    this.activeMatches.set(user2.userId, { 
      partnerId: user1.userId, 
      roomId,
      socketId: user2.socketId,
      startedAt: Date.now()
    });

    logger.success(`🎯 Match found: ${user1.userId} <-> ${user2.userId} in ${roomId}`);

    return {
      user1,
      user2,
      roomId
    };
  }

  endMatch(userId) {
    const match = this.activeMatches.get(userId);
    if (!match) {
      return null;
    }

    const partnerId = match.partnerId;
    const roomId = match.roomId;
    
    this.activeMatches.delete(userId);
    this.activeMatches.delete(partnerId);

    logger.info(`🔚 Match ended: ${userId} <-> ${partnerId}`);

    return { partnerId, roomId };
  }

  getActiveMatch(userId) {
    return this.activeMatches.get(userId);
  }

  getQueueSize() {
    return this.queue.length;
  }

  getActiveMatchesCount() {
    return this.activeMatches.size / 2; // Divide by 2 since each match has 2 entries
  }

  // Handle disconnection
  handleDisconnect(userId) {
    // Remove from queue if present
    this.removeFromQueue(userId);
    
    // End active match if present
    const matchEnded = this.endMatch(userId);
    
    // Remove socket mapping
    this.userSockets.delete(userId);
    
    return matchEnded;
  }

  // Get socket ID for a user
  getSocketId(userId) {
    return this.userSockets.get(userId);
  }

  // Clean up stale queue entries (optional, for timeout handling)
  cleanStaleQueueEntries(timeoutMs = 5 * 60 * 1000) {
    const now = Date.now();
    const initialLength = this.queue.length;
    
    this.queue = this.queue.filter(user => {
      const isStale = (now - user.joinedAt) > timeoutMs;
      if (isStale) {
        logger.warn(`⏰ Removing stale queue entry: ${user.userId}`);
        this.userSockets.delete(user.userId);
      }
      return !isStale;
    });
    
    if (this.queue.length < initialLength) {
      logger.info(`🧹 Cleaned ${initialLength - this.queue.length} stale entries`);
    }
  }
}

module.exports = new MatchmakingService();