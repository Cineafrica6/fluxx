const matchmakingService = require('../services/matchmakingService');
const moderationService = require('../services/moderationService');
const logger = require('../utils/logger');

module.exports = (io, socket) => {
  const userId = socket.userId;

  // Report user during active chat
  socket.on('report_user', async ({ reason, additionalDetails }) => {
    try {
      const match = matchmakingService.getActiveMatch(userId);
      
      if (!match) {
        socket.emit('error', { message: 'No active chat to report' });
        return;
      }

      const reportedUserId = match.partnerId;

      // Submit report
      const result = await moderationService.handleReport(
        userId,
        reportedUserId,
        reason,
        additionalDetails
      );

      socket.emit('report_submitted', { 
        message: 'Report submitted successfully',
        userBanned: result.userBanned
      });

      // If user was banned, notify them
      if (result.userBanned) {
        const partnerSocketId = matchmakingService.getSocketId(reportedUserId);
        if (partnerSocketId) {
          io.to(partnerSocketId).emit('banned', {
            message: 'You have been banned due to multiple reports',
            reason: reason
          });
        }

        // End the match
        matchmakingService.endMatch(userId);
        socket.emit('match_ended', { reason: 'Partner was banned' });
      }

      logger.warn(`🚨 Report filed: ${userId} reported ${reportedUserId} for ${reason}`);

    } catch (error) {
      logger.error('Report user error:', error);
      socket.emit('error', { message: 'Failed to submit report' });
    }
  });

  // Typing indicator (optional feature)
  socket.on('typing', () => {
    const match = matchmakingService.getActiveMatch(userId);
    
    if (match) {
      const partnerSocketId = matchmakingService.getSocketId(match.partnerId);
      if (partnerSocketId) {
        io.to(partnerSocketId).emit('partner_typing');
      }
    }
  });

  // Connection quality report (optional)
  socket.on('connection_quality', ({ quality }) => {
    logger.info(`📊 Connection quality from ${userId}: ${quality}`);
    // You could store this for analytics
  });
};