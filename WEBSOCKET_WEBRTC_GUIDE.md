# Fluxx WebSocket & WebRTC Integration Guide

This comprehensive guide covers the complete implementation of the queue system, WebSocket connection, and WebRTC video chat for the Fluxx frontend.

## Table of Contents

1. [Overview](#overview)
2. [WebSocket Connection](#websocket-connection)
3. [Queue System](#queue-system)
4. [Matchmaking Flow](#matchmaking-flow)
5. [WebRTC Implementation](#webrtc-implementation)
6. [Complete User Flow](#complete-user-flow)
7. [State Management](#state-management)
8. [Error Handling](#error-handling)
9. [Best Practices](#best-practices)
10. [Code Examples](#code-examples)

---

## Overview

The Fluxx video chat system consists of three main components:

1. **WebSocket (Socket.IO)**: Real-time bidirectional communication for matchmaking and signaling
2. **Queue System**: Manages users waiting to be matched
3. **WebRTC**: Peer-to-peer video/audio connection between matched users

### Architecture Flow

```
User → WebSocket Connection → Join Queue → Match Found → WebRTC Signaling → Video Chat
```

---

## WebSocket Connection

### Initialization

The WebSocket connection must be established using Socket.IO with JWT authentication.

#### Connection Setup

```javascript
import { io } from 'socket.io-client';

// Get your API base URL (without /api)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const SOCKET_URL = API_BASE_URL.replace('/api', '');

// Get JWT token from storage
const token = localStorage.getItem('fluxx_token');

// Initialize Socket.IO connection
const socket = io(SOCKET_URL, {
  auth: {
    token: token  // JWT token for authentication
  },
  transports: ['websocket', 'polling'],  // Fallback to polling if websocket fails
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});
```

**Important Notes:**
- Token must be provided in `auth.token`, not in headers
- Socket.IO runs on the same host as the API (just remove `/api`)
- Connection requires valid JWT token

### Connection Events

#### Connection Established

```javascript
socket.on('connect', () => {
  console.log('✅ Connected to server');
  console.log('Socket ID:', socket.id);
  // Update UI: show connected state
  // Enable "Start Video" button
});
```

#### Connection Lost

```javascript
socket.on('disconnect', (reason) => {
  console.log('❌ Disconnected:', reason);
  // Update UI: show disconnected state
  // Disable video features
  // Show reconnection message
});
```

#### Connection Errors

```javascript
socket.on('error', (error) => {
  console.error('Socket error:', error.message);
  
  // Handle specific errors
  if (error.message.includes('Authentication')) {
    // Token expired or invalid
    // Redirect to login
    handleAuthError();
  } else {
    // Other errors
    showError(error.message);
  }
});
```

#### Reconnection

```javascript
socket.on('reconnect', (attemptNumber) => {
  console.log('Reconnected after', attemptNumber, 'attempts');
  // Rejoin queue if user was in queue
  // Restore video state if needed
});

socket.on('reconnect_attempt', (attemptNumber) => {
  console.log('Reconnection attempt', attemptNumber);
  // Show reconnecting indicator
});

socket.on('reconnect_failed', () => {
  console.error('Failed to reconnect');
  // Show error message
  // Offer manual reconnect option
});
```

### Connection State Management

```javascript
// Track connection state
let isConnected = false;

socket.on('connect', () => {
  isConnected = true;
  updateConnectionUI(true);
});

socket.on('disconnect', () => {
  isConnected = false;
  updateConnectionUI(false);
});

// Helper function
function updateConnectionUI(connected) {
  const statusElement = document.getElementById('connectionStatus');
  statusElement.textContent = connected ? 'Connected ✅' : 'Disconnected ❌';
  statusElement.className = connected ? 'status-connected' : 'status-disconnected';
}
```

---

## Queue System

### Joining the Queue

When a user clicks "Start Video", they should:
1. Start local video stream (getUserMedia)
2. Automatically join the matchmaking queue

#### Join Queue Event

```javascript
// Emit join_queue event
socket.emit('join_queue');

// Listen for confirmation
socket.on('queue_joined', (data) => {
  console.log('Queue joined:', data.message);
  console.log('Position in queue:', data.position);
  
  // Update UI
  // - Show "Looking for someone..." message
  // - Disable "Start Video" button
  // - Show loading indicator
  // - Optionally show queue position
});
```

**Backend Response:**
```json
{
  "position": 1,
  "message": "Looking for a match..."
}
```

#### Queue Errors

```javascript
socket.on('error', (error) => {
  if (error.message === 'You are already in an active chat') {
    // User is already matched
    // Show current match UI
  } else if (error.message === 'Failed to join queue') {
    // Server error
    // Show error message, allow retry
  }
});
```

#### Banned User

```javascript
socket.on('banned', (data) => {
  console.error('Banned:', data.message);
  console.log('Ban expires:', data.banExpiresAt);
  console.log('Reason:', data.banReason);
  
  // Show ban message
  // Disable all features
  // Redirect to appropriate page
});
```

### Leaving the Queue

Users can manually leave the queue before being matched:

```javascript
// Emit leave_queue event
socket.emit('leave_queue');

// Listen for confirmation
socket.on('queue_left', (data) => {
  console.log('Left queue:', data.message);
  
  // Update UI
  // - Re-enable "Start Video" button
  // - Hide loading indicator
  // - Stop local video if desired
});
```

### Queue State Management

```javascript
// Track queue state
let queueState = {
  inQueue: false,
  position: null,
  searching: false
};

socket.on('queue_joined', (data) => {
  queueState.inQueue = true;
  queueState.position = data.position;
  queueState.searching = true;
  updateQueueUI();
});

socket.on('queue_left', () => {
  queueState.inQueue = false;
  queueState.position = null;
  queueState.searching = false;
  updateQueueUI();
});

function updateQueueUI() {
  if (queueState.searching) {
    showMessage('Looking for someone...');
    showLoadingIndicator();
  } else {
    hideMessage();
    hideLoadingIndicator();
  }
}
```

---

## Matchmaking Flow

### Match Found

When two users are matched, both receive a `match_found` event:

```javascript
socket.on('match_found', async (data) => {
  console.log('🎉 Match found!');
  console.log('Room ID:', data.roomId);
  console.log('Partner ID:', data.partnerId);
  
  // Store room ID for WebRTC signaling
  currentRoomId = data.roomId;
  partnerId = data.partnerId;
  
  // Update UI
  // - Hide "Looking for someone..." message
  // - Show "Connected!" message
  // - Update button states
  
  // Start WebRTC connection
  // The first user to receive match_found becomes the initiator
  await startWebRTC(true);  // true = initiator
});
```

**Backend Response:**
```json
{
  "roomId": "room_507f1f77bcf86cd799439011_507f1f77bcf86cd799439012_1234567890",
  "partnerId": "507f1f77bcf86cd799439012",
  "message": "Match found! Starting video chat..."
}
```

**Important:**
- Both users receive `match_found` simultaneously
- The backend randomly selects which user becomes the initiator
- The initiator creates the WebRTC offer
- The receiver waits for the offer and creates an answer

### Next Match

Users can click "Next" to end the current match and find a new partner:

```javascript
// Emit next_match event
socket.emit('next_match');

// Listen for match ended
socket.on('match_ended', (data) => {
  console.log('Match ended:', data.reason);
  
  // Clean up WebRTC
  cleanupWebRTC();
  
  // Update UI
  // - Show "Looking for next match..." message
  // - Keep local video active
  // - Clear remote video
});

// Listen for queue rejoin (automatic)
socket.on('queue_joined', (data) => {
  console.log('Rejoined queue:', data.message);
  // User is automatically back in queue
  // New match will be found soon
});
```

**Flow:**
1. User clicks "Next"
2. Backend ends current match
3. User receives `match_ended` event
4. Backend automatically rejoins user to queue
5. User receives `queue_joined` event
6. New match is attempted immediately

### End Chat

Users can completely end the chat (not look for next match):

```javascript
// Emit end_chat event
socket.emit('end_chat');

// Listen for confirmation
socket.on('chat_ended', (data) => {
  console.log('Chat ended:', data.message);
  
  // Clean up WebRTC
  cleanupWebRTC();
  
  // Stop local video
  stopLocalVideo();
  
  // Update UI
  // - Re-enable "Start Video" button
  // - Show idle state
});
```

### Partner Disconnected

If the partner disconnects, the remaining user is automatically rejoined to the queue:

```javascript
socket.on('partner_disconnected', (data) => {
  console.log('Partner disconnected:', data.message);
  console.log('Auto-rejoin:', data.autoRejoin);
  
  // Clean up WebRTC
  cleanupWebRTC();
  
  // Show message
  showMessage('Your partner disconnected. Looking for someone else...');
  
  // User is automatically rejoined to queue
  // No action needed - just wait for next match_found
});

socket.on('partner_left', (data) => {
  console.log('Partner left:', data.reason);
  
  // Clean up WebRTC
  cleanupWebRTC();
  
  // Show message based on reason
  if (data.reason === 'Partner clicked next') {
    showMessage('Your partner clicked next. Looking for someone else...');
  } else if (data.reason === 'Partner ended chat') {
    showMessage('Your partner ended the chat.');
  }
  
  // If autoRejoin is true, user will be automatically rejoined
});
```

---

## WebRTC Implementation

### WebRTC Configuration

```javascript
// WebRTC configuration with STUN/TURN servers
const rtcConfig = {
  iceServers: [
    // STUN servers (for NAT traversal)
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    
    // TURN servers (for relay when direct connection fails)
    // Free TURN servers (may have rate limits)
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ],
  iceCandidatePoolSize: 10  // Pre-gather ICE candidates
};
```

### Starting Local Video

Before joining the queue, get user media:

```javascript
let localStream = null;

async function startLocalVideo() {
  try {
    // Request camera and microphone access
    localStream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user'  // Front camera
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
    
    // Display local video
    const localVideo = document.getElementById('localVideo');
    localVideo.srcObject = localStream;
    localVideo.muted = true;  // Mute local video to prevent feedback
    
    console.log('✅ Local video started');
    
    return localStream;
  } catch (error) {
    console.error('❌ Failed to start video:', error);
    
    // Handle specific errors
    if (error.name === 'NotAllowedError') {
      showError('Camera/microphone permission denied');
    } else if (error.name === 'NotFoundError') {
      showError('No camera/microphone found');
    } else {
      showError('Failed to access camera/microphone');
    }
    
    throw error;
  }
}
```

### Stopping Local Video

```javascript
function stopLocalVideo() {
  if (localStream) {
    // Stop all tracks
    localStream.getTracks().forEach(track => {
      track.stop();
    });
    
    // Clear video element
    const localVideo = document.getElementById('localVideo');
    localVideo.srcObject = null;
    
    localStream = null;
    console.log('✅ Local video stopped');
  }
}
```

### Creating Peer Connection

```javascript
let peerConnection = null;
let remoteStream = null;
let currentRoomId = null;

async function startWebRTC(isInitiator) {
  // Ensure local stream exists
  if (!localStream) {
    await startLocalVideo();
  }
  
  // Create remote stream
  if (!remoteStream) {
    remoteStream = new MediaStream();
  }
  
  // Create peer connection
  peerConnection = new RTCPeerConnection(rtcConfig);
  
  // Add local tracks to peer connection
  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
    console.log(`Added local ${track.kind} track`);
  });
  
  // Handle remote tracks
  peerConnection.ontrack = (event) => {
    console.log(`Received remote ${event.track.kind} track`);
    
    // Add track to remote stream
    if (event.streams && event.streams.length > 0) {
      // Use stream from event (preferred)
      const remoteVideo = document.getElementById('remoteVideo');
      remoteVideo.srcObject = event.streams[0];
    } else if (event.track) {
      // Fallback: add track to our remote stream
      remoteStream.addTrack(event.track);
      const remoteVideo = document.getElementById('remoteVideo');
      remoteVideo.srcObject = remoteStream;
    }
    
    // Play remote video
    playRemoteVideo();
  };
  
  // Handle ICE candidates
  peerConnection.onicecandidate = (event) => {
    if (event.candidate && socket && currentRoomId) {
      // Send ICE candidate to partner
      socket.emit('ice_candidate', {
        candidate: event.candidate,
        roomId: currentRoomId
      });
      console.log('ICE candidate sent');
    } else if (!event.candidate) {
      console.log('All ICE candidates gathered');
    }
  };
  
  // Handle connection state changes
  peerConnection.onconnectionstatechange = () => {
    const state = peerConnection.connectionState;
    console.log('Connection state:', state);
    
    if (state === 'connected') {
      console.log('✅ WebRTC connected!');
    } else if (state === 'failed') {
      console.error('❌ WebRTC connection failed');
      // Attempt recovery
      peerConnection.restartIce();
    } else if (state === 'disconnected') {
      console.warn('⚠️ WebRTC disconnected');
    }
  };
  
  // Handle ICE connection state
  peerConnection.oniceconnectionstatechange = () => {
    const state = peerConnection.iceConnectionState;
    console.log('ICE state:', state);
    
    if (state === 'connected' || state === 'completed') {
      console.log('✅ ICE connected!');
    } else if (state === 'failed') {
      console.error('❌ ICE failed');
      peerConnection.restartIce();
    }
  };
  
  // If initiator, create offer
  if (isInitiator) {
    await createOffer();
  }
}
```

### Creating Offer (Initiator)

```javascript
async function createOffer() {
  try {
    const offer = await peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true
    });
    
    await peerConnection.setLocalDescription(offer);
    
    // Send offer to partner via WebSocket
    socket.emit('webrtc_offer', {
      offer: offer,
      roomId: currentRoomId
    });
    
    console.log('✅ Offer created and sent');
  } catch (error) {
    console.error('❌ Error creating offer:', error);
  }
}
```

### Handling Offer (Receiver)

```javascript
socket.on('webrtc_offer', async (data) => {
  console.log('Received WebRTC offer from:', data.senderId);
  
  // If peer connection doesn't exist, create it
  if (!peerConnection) {
    await startWebRTC(false);  // false = not initiator
  }
  
  // Set remote description (offer)
  await peerConnection.setRemoteDescription(
    new RTCSessionDescription(data.offer)
  );
  
  // Create answer
  const answer = await peerConnection.createAnswer({
    offerToReceiveAudio: true,
    offerToReceiveVideo: true
  });
  
  await peerConnection.setLocalDescription(answer);
  
  // Send answer to partner
  socket.emit('webrtc_answer', {
    answer: answer,
    roomId: currentRoomId
  });
  
  console.log('✅ Answer created and sent');
});
```

### Handling Answer (Initiator)

```javascript
socket.on('webrtc_answer', async (data) => {
  console.log('Received WebRTC answer from:', data.senderId);
  
  if (!peerConnection) {
    console.error('No peer connection');
    return;
  }
  
  // Set remote description (answer)
  await peerConnection.setRemoteDescription(
    new RTCSessionDescription(data.answer)
  );
  
  console.log('✅ Answer received, connection established');
});
```

### Handling ICE Candidates

```javascript
socket.on('ice_candidate', async (data) => {
  console.log('Received ICE candidate from:', data.senderId);
  
  if (peerConnection && data.candidate) {
    try {
      await peerConnection.addIceCandidate(
        new RTCIceCandidate(data.candidate)
      );
      console.log('✅ ICE candidate added');
    } catch (error) {
      console.error('❌ Error adding ICE candidate:', error);
    }
  }
});
```

### Playing Remote Video

```javascript
function playRemoteVideo() {
  const remoteVideo = document.getElementById('remoteVideo');
  
  if (!remoteVideo || !remoteVideo.srcObject) {
    console.warn('Remote video element or stream missing');
    return;
  }
  
  // Ensure video is not muted
  remoteVideo.muted = false;
  
  // Set attributes for better compatibility
  remoteVideo.setAttribute('playsinline', 'true');
  remoteVideo.setAttribute('autoplay', 'true');
  
  // Try to play
  const playPromise = remoteVideo.play();
  
  if (playPromise !== undefined) {
    playPromise
      .then(() => {
        console.log('✅ Remote video playing');
      })
      .catch(error => {
        console.error('❌ Failed to play video:', error);
        // Retry after delay
        setTimeout(() => {
          remoteVideo.play().catch(err => {
            console.error('Retry failed:', err);
          });
        }, 500);
      });
  }
}
```

### Handling Track Changes

When user stops/starts video or audio, tracks need to be replaced:

```javascript
// Stop local video track
function stopLocalVideoTrack() {
  if (localStream) {
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.stop();
      
      // Remove from peer connection
      const sender = peerConnection.getSenders().find(
        s => s.track && s.track.kind === 'video'
      );
      if (sender) {
        peerConnection.removeTrack(sender);
      }
      
      // Create new offer to notify partner
      renegotiateConnection();
    }
  }
}

// Start local video track again
async function startLocalVideoTrack() {
  if (localStream) {
    const newStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false  // Keep existing audio
    });
    
    const newVideoTrack = newStream.getVideoTracks()[0];
    const sender = peerConnection.getSenders().find(
      s => s.track && s.track.kind === 'video'
    );
    
    if (sender) {
      await sender.replaceTrack(newVideoTrack);
    } else {
      peerConnection.addTrack(newVideoTrack, localStream);
    }
    
    // Update local video element
    const localVideo = document.getElementById('localVideo');
    localVideo.srcObject = localStream;
    
    // Renegotiate
    renegotiateConnection();
  }
}

// Renegotiate connection
async function renegotiateConnection() {
  if (!peerConnection || peerConnection.signalingState === 'closed') {
    return;
  }
  
  try {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    
    socket.emit('webrtc_offer', {
      offer: offer,
      roomId: currentRoomId
    });
    
    console.log('✅ Renegotiation offer sent');
  } catch (error) {
    console.error('❌ Renegotiation error:', error);
  }
}
```

### Cleaning Up WebRTC

```javascript
function cleanupWebRTC() {
  // Close peer connection
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  
  // Clear remote video
  const remoteVideo = document.getElementById('remoteVideo');
  if (remoteVideo) {
    remoteVideo.srcObject = null;
  }
  
  // Clear remote stream
  remoteStream = null;
  currentRoomId = null;
  
  console.log('✅ WebRTC cleaned up');
}
```

---

## Complete User Flow

### Flow Diagram

```
1. User Login
   ↓
2. Connect WebSocket (automatic on page load if token exists)
   ↓
3. User clicks "Start Video"
   ↓
4. Start local video (getUserMedia)
   ↓
5. Join queue (socket.emit('join_queue'))
   ↓
6. Wait for match (socket.on('queue_joined'))
   ↓
7. Match found (socket.on('match_found'))
   ↓
8. Start WebRTC
   ├─ Initiator: Create offer → Send offer
   └─ Receiver: Wait for offer → Create answer → Send answer
   ↓
9. Exchange ICE candidates
   ↓
10. WebRTC connection established
    ↓
11. Video chat active
    ├─ User clicks "Next" → End match → Rejoin queue → New match
    ├─ User clicks "End Chat" → End match → Stop video
    └─ Partner disconnects → Auto rejoin queue → New match
```

### Step-by-Step Implementation

#### 1. Initial Setup

```javascript
// On app initialization
async function initializeApp() {
  // Check if user is logged in
  const token = localStorage.getItem('fluxx_token');
  
  if (token) {
    // Connect WebSocket automatically
    await connectSocket();
    
    // Get user info
    await fetchUserInfo();
  }
}
```

#### 2. Start Video Flow

```javascript
async function handleStartVideo() {
  try {
    // 1. Start local video
    await startLocalVideo();
    
    // 2. Join queue
    socket.emit('join_queue');
    
    // 3. Update UI
    updateUI('searching');
  } catch (error) {
    console.error('Failed to start video:', error);
    showError('Failed to start video. Please try again.');
  }
}
```

#### 3. Match Found Flow

```javascript
socket.on('match_found', async (data) => {
  // Store room and partner info
  currentRoomId = data.roomId;
  partnerId = data.partnerId;
  
  // Update UI
  updateUI('matched');
  
  // Start WebRTC (random initiator selected by backend)
  await startWebRTC(true);  // Backend determines initiator
});
```

#### 4. Next Match Flow

```javascript
function handleNext() {
  // Emit next_match
  socket.emit('next_match');
  
  // Clean up current WebRTC
  cleanupWebRTC();
  
  // Update UI
  updateUI('searching');
  
  // User is automatically rejoined to queue
  // Wait for new match_found event
}
```

#### 5. End Chat Flow

```javascript
function handleEndChat() {
  // Emit end_chat
  socket.emit('end_chat');
  
  // Clean up WebRTC
  cleanupWebRTC();
  
  // Stop local video
  stopLocalVideo();
  
  // Update UI
  updateUI('idle');
}
```

---

## State Management

### Recommended State Structure

```javascript
// Application state
const appState = {
  // Connection
  socket: null,
  isConnected: false,
  
  // User
  user: null,
  token: null,
  
  // Queue
  queue: {
    inQueue: false,
    position: null,
    searching: false
  },
  
  // Match
  match: {
    active: false,
    roomId: null,
    partnerId: null
  },
  
  // WebRTC
  webrtc: {
    peerConnection: null,
    localStream: null,
    remoteStream: null,
    connectionState: 'disconnected',  // 'disconnected', 'connecting', 'connected', 'failed'
    iceState: 'new'  // 'new', 'checking', 'connected', 'completed', 'failed', 'disconnected'
  },
  
  // UI
  ui: {
    localVideoActive: false,
    remoteVideoActive: false,
    loading: false,
    error: null
  }
};
```

### State Update Functions

```javascript
function updateQueueState(state) {
  appState.queue = { ...appState.queue, ...state };
  renderQueueUI();
}

function updateMatchState(state) {
  appState.match = { ...appState.match, ...state };
  renderMatchUI();
}

function updateWebRTCState(state) {
  appState.webrtc = { ...appState.webrtc, ...state };
  renderWebRTCUI();
}

function updateUIState(state) {
  appState.ui = { ...appState.ui, ...state };
  renderUI();
}
```

---

## Error Handling

### Connection Errors

```javascript
socket.on('error', (error) => {
  const errorMessage = error.message;
  
  // Handle specific errors
  switch (errorMessage) {
    case 'Authentication error: No token provided':
    case 'Authentication error: Invalid token':
      // Token expired or invalid
      handleAuthError();
      break;
      
    case 'You are already in an active chat':
      // User already matched
      // Fetch current match state
      break;
      
    case 'Failed to join queue':
      // Server error
      showError('Failed to join queue. Please try again.');
      break;
      
    default:
      showError(errorMessage);
  }
});
```

### WebRTC Errors

```javascript
// Handle getUserMedia errors
async function startLocalVideo() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });
  } catch (error) {
    handleMediaError(error);
  }
}

function handleMediaError(error) {
  switch (error.name) {
    case 'NotAllowedError':
      showError('Camera/microphone permission denied. Please allow access.');
      break;
      
    case 'NotFoundError':
      showError('No camera/microphone found.');
      break;
      
    case 'NotReadableError':
      showError('Camera/microphone is being used by another application.');
      break;
      
    case 'OverconstrainedError':
      showError('Camera does not support requested settings.');
      break;
      
    default:
      showError('Failed to access camera/microphone.');
  }
}

// Handle WebRTC connection failures
peerConnection.onconnectionstatechange = () => {
  if (peerConnection.connectionState === 'failed') {
    console.error('WebRTC connection failed');
    
    // Attempt recovery
    try {
      peerConnection.restartIce();
    } catch (error) {
      console.error('Failed to restart ICE:', error);
      // Show error to user
      showError('Connection failed. Please try again.');
    }
  }
};
```

### Network Errors

```javascript
// Handle network disconnection
socket.on('disconnect', (reason) => {
  if (reason === 'io server disconnect') {
    // Server disconnected (e.g., server restart)
    // Attempt to reconnect
    socket.connect();
  } else if (reason === 'transport close') {
    // Network error
    showError('Network connection lost. Reconnecting...');
  }
});
```

---

## Best Practices

### 1. Connection Management

- **Auto-connect on login**: Connect WebSocket automatically when user logs in
- **Reconnection handling**: Implement automatic reconnection with exponential backoff
- **Connection state UI**: Always show connection status to users
- **Graceful degradation**: Handle connection failures gracefully

### 2. Queue Management

- **Single queue entry**: Ensure user is only in queue once
- **Queue state persistence**: Don't persist queue state across page refreshes
- **Queue timeout**: Handle users who stay in queue too long
- **Queue position**: Optionally show queue position to users

### 3. WebRTC Best Practices

- **Stream management**: Always stop tracks when done to free resources
- **Connection cleanup**: Properly close peer connections
- **Error recovery**: Implement ICE restart on connection failures
- **Track replacement**: Handle track changes (video on/off) properly
- **Bandwidth optimization**: Adjust video quality based on connection

### 4. UI/UX

- **Loading states**: Show loading indicators during queue and connection
- **Error messages**: Provide clear, actionable error messages
- **Status updates**: Keep users informed of connection and match status
- **Button states**: Disable/enable buttons based on current state
- **Video controls**: Provide controls for mute/unmute, video on/off

### 5. Performance

- **Lazy initialization**: Only initialize WebRTC when match is found
- **Resource cleanup**: Clean up streams and connections when not needed
- **Memory management**: Avoid memory leaks by properly disposing resources
- **Bandwidth management**: Monitor and adjust video quality

### 6. Security

- **Token validation**: Always validate JWT token before connecting
- **Room validation**: Verify room ID matches before processing WebRTC messages
- **Input validation**: Validate all user inputs
- **Error messages**: Don't expose sensitive information in error messages

---

## Code Examples

### Complete Integration Example

```javascript
// socketService.js
import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
  }
  
  connect(token) {
    const SOCKET_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5000';
    
    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });
    
    this.setupEventHandlers();
    
    return new Promise((resolve, reject) => {
      this.socket.on('connect', () => {
        this.isConnected = true;
        resolve();
      });
      
      this.socket.on('connect_error', (error) => {
        reject(error);
      });
    });
  }
  
  setupEventHandlers() {
    this.socket.on('connect', () => {
      this.isConnected = true;
      this.emit('connected');
    });
    
    this.socket.on('disconnect', () => {
      this.isConnected = false;
      this.emit('disconnected');
    });
    
    this.socket.on('error', (error) => {
      this.emit('error', error);
    });
  }
  
  joinQueue() {
    if (this.isConnected) {
      this.socket.emit('join_queue');
    }
  }
  
  leaveQueue() {
    if (this.isConnected) {
      this.socket.emit('leave_queue');
    }
  }
  
  nextMatch() {
    if (this.isConnected) {
      this.socket.emit('next_match');
    }
  }
  
  endChat() {
    if (this.isConnected) {
      this.socket.emit('end_chat');
    }
  }
  
  sendWebRTCOffer(offer, roomId) {
    if (this.isConnected) {
      this.socket.emit('webrtc_offer', { offer, roomId });
    }
  }
  
  sendWebRTCAnswer(answer, roomId) {
    if (this.isConnected) {
      this.socket.emit('webrtc_answer', { answer, roomId });
    }
  }
  
  sendICECandidate(candidate, roomId) {
    if (this.isConnected) {
      this.socket.emit('ice_candidate', { candidate, roomId });
    }
  }
  
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }
  
  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
    
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }
  
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => callback(data));
    }
  }
  
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }
}

export default new SocketService();
```

### WebRTC Service Example

```javascript
// webrtcService.js
class WebRTCService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.roomId = null;
  }
  
  async startLocalVideo() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      return this.localStream;
    } catch (error) {
      throw new Error(`Failed to start video: ${error.message}`);
    }
  }
  
  stopLocalVideo() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
  }
  
  async createPeerConnection(roomId, socketService, isInitiator) {
    this.roomId = roomId;
    
    const config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        // Add TURN servers as needed
      ]
    };
    
    this.peerConnection = new RTCPeerConnection(config);
    
    // Add local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });
    }
    
    // Setup event handlers
    this.setupPeerConnectionHandlers(socketService, isInitiator);
    
    // Create offer if initiator
    if (isInitiator) {
      await this.createOffer(socketService);
    }
  }
  
  setupPeerConnectionHandlers(socketService, isInitiator) {
    // Handle remote tracks
    this.peerConnection.ontrack = (event) => {
      if (event.streams && event.streams.length > 0) {
        this.remoteStream = event.streams[0];
        this.onRemoteStream(this.remoteStream);
      }
    };
    
    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.roomId) {
        socketService.sendICECandidate(event.candidate, this.roomId);
      }
    };
    
    // Handle connection state
    this.peerConnection.onconnectionstatechange = () => {
      this.onConnectionStateChange(this.peerConnection.connectionState);
    };
    
    // Handle ICE state
    this.peerConnection.oniceconnectionstatechange = () => {
      this.onICEStateChange(this.peerConnection.iceConnectionState);
    };
  }
  
  async createOffer(socketService) {
    const offer = await this.peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true
    });
    
    await this.peerConnection.setLocalDescription(offer);
    socketService.sendWebRTCOffer(offer, this.roomId);
  }
  
  async handleOffer(offer, socketService) {
    await this.peerConnection.setRemoteDescription(
      new RTCSessionDescription(offer)
    );
    
    const answer = await this.peerConnection.createAnswer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true
    });
    
    await this.peerConnection.setLocalDescription(answer);
    socketService.sendWebRTCAnswer(answer, this.roomId);
  }
  
  async handleAnswer(answer) {
    await this.peerConnection.setRemoteDescription(
      new RTCSessionDescription(answer)
    );
  }
  
  async handleICECandidate(candidate) {
    if (this.peerConnection && candidate) {
      await this.peerConnection.addIceCandidate(
        new RTCIceCandidate(candidate)
      );
    }
  }
  
  cleanup() {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    if (this.remoteStream) {
      this.remoteStream = null;
    }
    
    this.roomId = null;
  }
  
  // Callbacks (override in your component)
  onRemoteStream(stream) {}
  onConnectionStateChange(state) {}
  onICEStateChange(state) {}
}

export default WebRTCService;
```

### React Hook Example

```javascript
// useVideoChat.js
import { useState, useEffect, useRef } from 'react';
import socketService from './socketService';
import WebRTCService from './webrtcService';

export function useVideoChat() {
  const [state, setState] = useState({
    connected: false,
    inQueue: false,
    matched: false,
    roomId: null,
    partnerId: null
  });
  
  const webrtcRef = useRef(new WebRTCService());
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  
  useEffect(() => {
    const token = localStorage.getItem('fluxx_token');
    if (token) {
      connect(token);
    }
    
    return () => {
      disconnect();
    };
  }, []);
  
  const connect = async (token) => {
    try {
      await socketService.connect(token);
      setupSocketListeners();
      setState(prev => ({ ...prev, connected: true }));
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  };
  
  const setupSocketListeners = () => {
    socketService.on('queue_joined', (data) => {
      setState(prev => ({ ...prev, inQueue: true }));
    });
    
    socketService.on('match_found', async (data) => {
      setState(prev => ({
        ...prev,
        matched: true,
        roomId: data.roomId,
        partnerId: data.partnerId,
        inQueue: false
      }));
      
      // Start WebRTC
      await startWebRTC(data.roomId, true);
    });
    
    socketService.on('match_ended', () => {
      webrtcRef.current.cleanup();
      setState(prev => ({
        ...prev,
        matched: false,
        roomId: null,
        partnerId: null,
        inQueue: true
      }));
    });
    
    socketService.on('webrtc_offer', async (data) => {
      await webrtcRef.current.handleOffer(data.offer, socketService);
    });
    
    socketService.on('webrtc_answer', async (data) => {
      await webrtcRef.current.handleAnswer(data.answer);
    });
    
    socketService.on('ice_candidate', async (data) => {
      await webrtcRef.current.handleICECandidate(data.candidate);
    });
  };
  
  const startVideo = async () => {
    try {
      // Start local video
      const stream = await webrtcRef.current.startLocalVideo();
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      // Join queue
      socketService.joinQueue();
    } catch (error) {
      console.error('Failed to start video:', error);
    }
  };
  
  const startWebRTC = async (roomId, isInitiator) => {
    webrtcRef.current.onRemoteStream = (stream) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
        remoteVideoRef.current.play();
      }
    };
    
    await webrtcRef.current.createPeerConnection(
      roomId,
      socketService,
      isInitiator
    );
  };
  
  const nextMatch = () => {
    socketService.nextMatch();
  };
  
  const endChat = () => {
    socketService.endChat();
    webrtcRef.current.cleanup();
    webrtcRef.current.stopLocalVideo();
    setState(prev => ({
      ...prev,
      matched: false,
      inQueue: false,
      roomId: null,
      partnerId: null
    }));
  };
  
  const disconnect = () => {
    socketService.disconnect();
    webrtcRef.current.cleanup();
    webrtcRef.current.stopLocalVideo();
  };
  
  return {
    state,
    localVideoRef,
    remoteVideoRef,
    startVideo,
    nextMatch,
    endChat,
    disconnect
  };
}
```

---

## Summary

This guide covers:

1. **WebSocket Connection**: Authentication, connection management, event handling
2. **Queue System**: Joining, leaving, state management
3. **Matchmaking**: Match found, next match, end chat, partner disconnection
4. **WebRTC**: Peer connection, offer/answer, ICE candidates, track management
5. **Complete Flow**: Step-by-step user journey
6. **State Management**: Recommended state structure
7. **Error Handling**: Comprehensive error handling strategies
8. **Best Practices**: Production-ready recommendations
9. **Code Examples**: Complete implementation examples

For additional details, refer to the main [Frontend Integration Guide](./FRONTEND_INTEGRATION_GUIDE.md).

