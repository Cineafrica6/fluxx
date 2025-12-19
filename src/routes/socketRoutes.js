/**
 * Socket.IO Events Documentation
 * 
 * All Socket.IO events require authentication via JWT token in the handshake:
 * 
 * ```javascript
 * const socket = io(serverUrl, {
 *   auth: { token: 'your-jwt-token' }
 * });
 * ```
 * 
 * @swagger
 * components:
 *   schemas:
 *     SocketEvent:
 *       type: object
 *       description: Base structure for Socket.IO events
 * 
 * @swagger
 * tags:
 *   - name: Socket.IO
 *     description: Real-time WebSocket events for video chat and matchmaking
 */

/**
 * @swagger
 * /socket.io:
 *   get:
 *     summary: Socket.IO Connection
 *     description: |
 *       Connect to Socket.IO server for real-time communication.
 *       
 *       **Authentication:** Pass JWT token in handshake auth
 *       
 *       **Events Emitted by Client:**
 *       - `join_queue` - Join matchmaking queue
 *       - `leave_queue` - Leave matchmaking queue
 *       - `next_match` - End current match and find next
 *       - `end_chat` - End chat completely
 *       - `webrtc_offer` - Send WebRTC offer
 *       - `webrtc_answer` - Send WebRTC answer
 *       - `ice_candidate` - Send ICE candidate
 *       - `report_user` - Report current chat partner
 *       - `typing` - Send typing indicator
 *       - `connection_quality` - Report connection quality
 *       
 *       **Events Received from Server:**
 *       - `connect` - Connection established
 *       - `disconnect` - Connection lost
 *       - `error` - Error occurred
 *       - `queue_joined` - Successfully joined queue
 *       - `queue_left` - Left queue
 *       - `match_found` - Match found, starting chat
 *       - `match_ended` - Current match ended
 *       - `partner_left` - Partner left the chat
 *       - `partner_disconnected` - Partner disconnected
 *       - `webrtc_offer` - Received WebRTC offer
 *       - `webrtc_answer` - Received WebRTC answer
 *       - `ice_candidate` - Received ICE candidate
 *       - `report_submitted` - Report submitted successfully
 *       - `banned` - User has been banned
 *       - `partner_typing` - Partner is typing
 *     tags: [Socket.IO]
 *     responses:
 *       200:
 *         description: Socket.IO connection established
 */

// This file is for documentation only - actual Socket.IO setup is in src/config/socket.js

module.exports = {};

