const matchmakingService = require('../services/matchmakingService');
const User = require('../models/User');
const logger = require('../utils/logger');

module.exports = (io, socket) => {
  const userId = socket.userId;

  // Join matchmaking queue
  socket.on('join_queue', async () => {
    try {
      // Check if user is banned
      const user = await User.findById(userId);
      if (!user) {
        socket.emit('error', { message: 'User not found' });
        return;
      }

      if (user.isCurrentlyBanned()) {
        socket.emit('banned', { 
          message: 'You are banned from using Fluxx',
          banExpiresAt: user.banExpiresAt,
          banReason: user.banReason
        });
        return;
      }

      // Check if already in an active match
      const existingMatch = matchmakingService.getActiveMatch(userId);
      if (existingMatch) {
        socket.emit('error', { message: 'You are already in an active chat' });
        return;
      }

      // Add to queue
      const queueSize = matchmakingService.addToQueue(userId, socket.id);
      
      socket.emit('queue_joined', { 
        position: queueSize,
        message: 'Looking for a match...' 
      });

      // Try to find a match immediately
      attemptMatch(io);

    } catch (error) {
      logger.error('Join queue error:', error);
      socket.emit('error', { message: 'Failed to join queue' });
    }
  });

//   socket.on('disconnect', () => {
//     matchmakingService.removeFromQueue(userId);
//   });

  socket.on('leave_queue', () => {
    const removed = matchmakingService.removeFromQueue(userId);
    
    if (removed) {
      socket.emit('queue_left', { message: 'Left matchmaking queue' });
    }
  });

  // Next button - end current match and rejoin queue
  socket.on('next_match', async () => {
    try {
      const matchEnded = matchmakingService.endMatch(userId);
      
      if (matchEnded) {
        const { partnerId, roomId } = matchEnded;
        
        // Notify both users
        io.to(socket.id).emit('match_ended', { reason: 'next_clicked' });
        
        const partnerSocketId = matchmakingService.getSocketId(partnerId);
        if (partnerSocketId) {
          io.to(partnerSocketId).emit('partner_left', { reason: 'Partner clicked next' });
        }

        // Leave the room
        socket.leave(roomId);
        
        // Rejoin queue automatically
        const queueSize = matchmakingService.addToQueue(userId, socket.id);
        socket.emit('queue_joined', { 
          position: queueSize,
          message: 'Looking for next match...' 
        });

        // Try to find new match
        attemptMatch(io);
      }
    } catch (error) {
      logger.error('Next match error:', error);
      socket.emit('error', { message: 'Failed to find next match' });
    }
  });

  // End chat completely
  socket.on('end_chat', () => {
    const matchEnded = matchmakingService.endMatch(userId);
    
    if (matchEnded) {
      const { partnerId, roomId } = matchEnded;
      
      // Notify both users
      io.to(socket.id).emit('chat_ended', { message: 'Chat ended' });
      
      const partnerSocketId = matchmakingService.getSocketId(partnerId);
      if (partnerSocketId) {
        io.to(partnerSocketId).emit('partner_left', { reason: 'Partner ended chat' });
      }

      // Leave the room
      socket.leave(roomId);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    const matchEnded = matchmakingService.handleDisconnect(userId);
    
    if (matchEnded) {
      const { partnerId, roomId } = matchEnded;
      
      // Notify partner and automatically rejoin them to queue
      const partnerSocketId = matchmakingService.getSocketId(partnerId);
      if (partnerSocketId) {
        const partnerSocket = io.sockets.sockets.get(partnerSocketId);
        if (partnerSocket) {
          // Notify partner
          partnerSocket.emit('partner_disconnected', { 
            message: 'Your partner disconnected',
            autoRejoin: true
          });
          
          // Automatically rejoin partner to queue
          const queueSize = matchmakingService.addToQueue(partnerId, partnerSocketId);
          partnerSocket.emit('queue_joined', { 
            position: queueSize,
            message: 'Looking for next match...' 
          });
          
          // Try to find new match
          attemptMatch(io);
        }
      }
    }
    
    logger.info(`👋 User disconnected: ${userId}`);
  });
};

// Helper function to attempt matching
function attemptMatch(io) {
  const match = matchmakingService.findMatch();
  
  if (match) {
    const { user1, user2, roomId } = match;
    
    // Get socket instances
    const socket1 = io.sockets.sockets.get(user1.socketId);
    const socket2 = io.sockets.sockets.get(user2.socketId);
    
    if (socket1 && socket2) {
      // Join both to the same room
      socket1.join(roomId);
      socket2.join(roomId);
      
      // Notify both users
      socket1.emit('match_found', { 
        roomId,
        partnerId: user2.userId,
        message: 'Match found! Starting video chat...'
      });
      
      socket2.emit('match_found', { 
        roomId,
        partnerId: user1.userId,
        message: 'Match found! Starting video chat...'
      });
      
      logger.success(`🎉 Match created: ${roomId}`);
    }
  }
}