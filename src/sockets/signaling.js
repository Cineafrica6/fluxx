const matchmakingService = require('../services/matchmakingService');
const logger = require('../utils/logger');

module.exports = (io, socket) => {
  const userId = socket.userId;

  // WebRTC Offer
  socket.on('webrtc_offer', ({ offer, roomId }) => {
    try {
      const match = matchmakingService.getActiveMatch(userId);
      
      if (!match || match.roomId !== roomId) {
        socket.emit('error', { message: 'Invalid room' });
        return;
      }

      const partnerSocketId = matchmakingService.getSocketId(match.partnerId);
      
      if (partnerSocketId) {
        io.to(partnerSocketId).emit('webrtc_offer', { 
          offer,
          senderId: userId 
        });
        
        logger.info(`📡 WebRTC offer sent: ${userId} -> ${match.partnerId}`);
      }
    } catch (error) {
      logger.error('WebRTC offer error:', error);
      socket.emit('error', { message: 'Failed to send offer' });
    }
  });

  // WebRTC Answer
  socket.on('webrtc_answer', ({ answer, roomId }) => {
    try {
      const match = matchmakingService.getActiveMatch(userId);
      
      if (!match || match.roomId !== roomId) {
        socket.emit('error', { message: 'Invalid room' });
        return;
      }

      const partnerSocketId = matchmakingService.getSocketId(match.partnerId);
      
      if (partnerSocketId) {
        io.to(partnerSocketId).emit('webrtc_answer', { 
          answer,
          senderId: userId 
        });
        
        logger.info(`📡 WebRTC answer sent: ${userId} -> ${match.partnerId}`);
      }
    } catch (error) {
      logger.error('WebRTC answer error:', error);
      socket.emit('error', { message: 'Failed to send answer' });
    }
  });

  // ICE Candidate
  socket.on('ice_candidate', ({ candidate, roomId }) => {
    try {
      const match = matchmakingService.getActiveMatch(userId);
      
      if (!match || match.roomId !== roomId) {
        return; // Silently ignore invalid ICE candidates
      }

      const partnerSocketId = matchmakingService.getSocketId(match.partnerId);
      
      if (partnerSocketId) {
        io.to(partnerSocketId).emit('ice_candidate', { 
          candidate,
          senderId: userId 
        });
      }
    } catch (error) {
      logger.error('ICE candidate error:', error);
    }
  });
};