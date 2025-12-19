# Fluxx Backend API Integration Guide

This guide provides comprehensive documentation for integrating the Fluxx backend API into your frontend application.

## Table of Contents

1. [Base Configuration](#base-configuration)
2. [Authentication](#authentication)
3. [User Management](#user-management)
4. [Reports](#reports)
5. [Admin Endpoints](#admin-endpoints)
6. [Socket.IO Integration](#socketio-integration)
7. [WebRTC Video Chat](#webrtc-video-chat)
8. [Error Handling](#error-handling)
9. [Best Practices](#best-practices)

---

## Base Configuration

### API Base URL

```javascript
// Development
const API_BASE_URL = 'http://localhost:5000/api';

// Production (update with your deployed URL)
const API_BASE_URL = 'https://your-domain.com/api';
```

### Headers

All authenticated requests require a JWT token in the Authorization header:

```javascript
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
};
```

---

## Authentication

### 1. Register New User

**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "displayName": "johndoe123",
  "email": "user@example.com",
  "password": "password123"
}
```

**Username Requirements:**
- 3-20 characters
- Alphanumeric, underscores, and hyphens only
- Cannot start or end with `_` or `-`
- Must be unique

**Response (201):**
```json
{
  "success": true,
  "message": "Registration successful. Please verify your account with the OTP.",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "displayName": "johndoe123",
      "isVerified": false
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "otp": "123456"
  }
}
```

**Error Responses:**
- `400` - Validation error, username taken, or email exists
- `500` - Server error

**Example:**
```javascript
async function register(displayName, email, password) {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName, email, password })
  });
  
  const data = await response.json();
  
  if (data.success) {
    // Store token
    localStorage.setItem('fluxx_token', data.data.token);
    // Show OTP to user (or they'll receive it via email)
    return data.data;
  } else {
    throw new Error(data.message);
  }
}
```

---

### 2. Login

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "displayName": "johndoe123",
      "isVerified": true,
      "isAdmin": false
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses:**
- `401` - Invalid credentials
- `403` - User is banned

**Example:**
```javascript
async function login(email, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  
  if (data.success) {
    localStorage.setItem('fluxx_token', data.data.token);
    return data.data.user;
  } else {
    throw new Error(data.message);
  }
}
```

---

### 3. Verify Email with OTP

**Endpoint:** `POST /api/auth/verify-email`

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

**Error Responses:**
- `400` - Invalid or expired OTP
- `404` - User not found

**Example:**
```javascript
async function verifyEmail(email, otp) {
  const response = await fetch(`${API_BASE_URL}/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp })
  });
  
  const data = await response.json();
  return data.success;
}
```

---

### 4. Resend OTP

**Endpoint:** `POST /api/auth/resend-otp`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "OTP sent successfully. Please check your email.",
  "data": {
    "otp": "123456"
  }
}
```

---

### 5. Get Current User

**Endpoint:** `GET /api/auth/me`

**Headers:** Requires `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "displayName": "johndoe123",
    "isVerified": true,
    "isAdmin": false,
    "reportCount": 0,
    "isBanned": false,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Example:**
```javascript
async function getCurrentUser() {
  const token = localStorage.getItem('fluxx_token');
  
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const data = await response.json();
  return data.data;
}
```

---

## User Management

### Get User Profile

**Endpoint:** `GET /api/users/:userId`

**Headers:** Requires `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "displayName": "johndoe123",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `404` - User not found
- `401` - Not authorized

---

## Reports

### Submit Report

**Endpoint:** `POST /api/reports`

**Headers:** Requires `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "reportedUserId": "507f1f77bcf86cd799439012",
  "reason": "inappropriate_content",
  "additionalDetails": "User showed inappropriate content during video chat"
}
```

**Report Reasons:**
- `inappropriate_content`
- `harassment`
- `nudity`
- `spam`
- `other`

**Response (201):**
```json
{
  "success": true,
  "message": "Report submitted successfully",
  "data": {
    "userBanned": false,
    "reportCount": 1
  }
}
```

**Example:**
```javascript
async function submitReport(reportedUserId, reason, additionalDetails = '') {
  const token = localStorage.getItem('fluxx_token');
  
  const response = await fetch(`${API_BASE_URL}/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ reportedUserId, reason, additionalDetails })
  });
  
  const data = await response.json();
  return data;
}
```

---

### Get My Report Stats

**Endpoint:** `GET /api/reports/me`

**Headers:** Requires `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "reportCount": 2,
    "reportsLast24h": 1,
    "isBanned": false
  }
}
```

---

## Admin Endpoints

> **Note:** All admin endpoints require admin privileges.

### Get Dashboard Stats

**Endpoint:** `GET /api/admin/stats`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalUsers": 150,
    "activeUsers": 45,
    "totalReports": 23,
    "pendingReports": 5,
    "bannedUsers": 3
  }
}
```

---

### Get All Reports

**Endpoint:** `GET /api/admin/reports`

**Query Parameters:**
- `status` (optional): `pending`, `reviewed`, `dismissed`
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

---

### Get All Users

**Endpoint:** `GET /api/admin/users`

**Query Parameters:**
- `banned` (optional): `true` or `false`
- `page` (optional): Page number
- `limit` (optional): Items per page

---

### Ban User

**Endpoint:** `POST /api/admin/users/:userId/ban`

**Request Body:**
```json
{
  "reason": "Multiple reports of harassment"
}
```

---

### Unban User

**Endpoint:** `POST /api/admin/users/:userId/unban`

---

### Update Report Status

**Endpoint:** `PATCH /api/admin/reports/:reportId`

**Request Body:**
```json
{
  "status": "reviewed",
  "actionTaken": "User banned for 7 days"
}
```

---

## Socket.IO Integration

### Connection Setup

```javascript
import io from 'socket.io-client';

// Connect to Socket.IO server
const socket = io(API_BASE_URL.replace('/api', ''), {
  auth: {
    token: localStorage.getItem('fluxx_token')
  }
});

socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});

socket.on('error', (data) => {
  console.error('Socket error:', data.message);
});
```

---

### Matchmaking Events

#### Join Queue

**Emit:** `join_queue`

```javascript
socket.emit('join_queue');
```

**Listen:** `queue_joined`

```javascript
socket.on('queue_joined', (data) => {
  console.log('Queue joined:', data.message);
  // data.position - queue position
  // data.message - status message
});
```

---

#### Leave Queue

**Emit:** `leave_queue`

```javascript
socket.emit('leave_queue');
```

**Listen:** `queue_left`

```javascript
socket.on('queue_left', (data) => {
  console.log('Left queue:', data.message);
});
```

---

#### Match Found

**Listen:** `match_found`

```javascript
socket.on('match_found', async (data) => {
  console.log('Match found!', data);
  // data.roomId - room ID for WebRTC
  // data.partnerId - partner's user ID
  // data.message - status message
  
  // Initialize WebRTC connection here
  await startWebRTC(data.roomId, data.partnerId);
});
```

---

#### Next Match

**Emit:** `next_match`

```javascript
socket.emit('next_match');
```

**Listen:** `match_ended`

```javascript
socket.on('match_ended', (data) => {
  console.log('Match ended:', data.reason);
  // Clean up WebRTC connection
  cleanupWebRTC();
});
```

---

#### End Chat

**Emit:** `end_chat`

```javascript
socket.emit('end_chat');
```

**Listen:** `chat_ended`

```javascript
socket.on('chat_ended', (data) => {
  console.log('Chat ended:', data.message);
});
```

---

#### Partner Events

**Listen:** `partner_left`

```javascript
socket.on('partner_left', (data) => {
  console.log('Partner left:', data.reason);
  // Partner clicked "Next" or ended chat
});
```

**Listen:** `partner_disconnected`

```javascript
socket.on('partner_disconnected', (data) => {
  console.log('Partner disconnected:', data.message);
  // Partner's connection was lost
  // User is automatically rejoined to queue
});
```

---

## WebRTC Video Chat

### WebRTC Configuration

```javascript
const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    // Add TURN servers for better connectivity
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ],
  iceCandidatePoolSize: 10
};
```

---

### WebRTC Signaling Events

#### Send Offer

**Emit:** `webrtc_offer`

```javascript
socket.emit('webrtc_offer', {
  offer: offer,
  roomId: roomId
});
```

**Listen:** `webrtc_offer`

```javascript
socket.on('webrtc_offer', async (data) => {
  // data.offer - RTCSessionDescription
  // data.senderId - sender's user ID
  
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  
  socket.emit('webrtc_answer', {
    answer: answer,
    roomId: roomId
  });
});
```

---

#### Send Answer

**Emit:** `webrtc_answer`

```javascript
socket.emit('webrtc_answer', {
  answer: answer,
  roomId: roomId
});
```

**Listen:** `webrtc_answer`

```javascript
socket.on('webrtc_answer', async (data) => {
  // data.answer - RTCSessionDescription
  await peerConnection.setRemoteDescription(data.answer);
});
```

---

#### Send ICE Candidate

**Emit:** `ice_candidate`

```javascript
peerConnection.onicecandidate = (event) => {
  if (event.candidate) {
    socket.emit('ice_candidate', {
      candidate: event.candidate,
      roomId: roomId
    });
  }
};
```

**Listen:** `ice_candidate`

```javascript
socket.on('ice_candidate', async (data) => {
  // data.candidate - RTCIceCandidate
  await peerConnection.addIceCandidate(data.candidate);
});
```

---

### Complete WebRTC Example

```javascript
let peerConnection = null;
let localStream = null;
let remoteStream = null;

async function startWebRTC(roomId, partnerId, isInitiator = false) {
  // Get user media
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  });
  
  // Create peer connection
  peerConnection = new RTCPeerConnection(rtcConfig);
  
  // Add local tracks
  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });
  
  // Handle remote tracks
  peerConnection.ontrack = (event) => {
    remoteStream = event.streams[0];
    // Display remote video
    remoteVideo.srcObject = remoteStream;
  };
  
  // Handle ICE candidates
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('ice_candidate', {
        candidate: event.candidate,
        roomId: roomId
      });
    }
  };
  
  // Create and send offer (if initiator)
  if (isInitiator) {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    
    socket.emit('webrtc_offer', {
      offer: offer,
      roomId: roomId
    });
  }
}

// Listen for WebRTC events
socket.on('webrtc_offer', async (data) => {
  await peerConnection.setRemoteDescription(data.offer);
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  
  socket.emit('webrtc_answer', {
    answer: answer,
    roomId: currentRoomId
  });
});

socket.on('webrtc_answer', async (data) => {
  await peerConnection.setRemoteDescription(data.answer);
});

socket.on('ice_candidate', async (data) => {
  await peerConnection.addIceCandidate(data.candidate);
});
```

---

## Chat Events

### Report User During Chat

**Emit:** `report_user`

```javascript
socket.emit('report_user', {
  reason: 'inappropriate_content',
  additionalDetails: 'User showed inappropriate content'
});
```

**Listen:** `report_submitted`

```javascript
socket.on('report_submitted', (data) => {
  console.log('Report submitted:', data.message);
  // data.userBanned - whether reported user was banned
});
```

---

### Typing Indicator

**Emit:** `typing`

```javascript
socket.emit('typing');
```

**Listen:** `partner_typing`

```javascript
socket.on('partner_typing', () => {
  // Show typing indicator
});
```

---

### Connection Quality

**Emit:** `connection_quality`

```javascript
socket.emit('connection_quality', {
  quality: 'good' // 'good', 'fair', 'poor'
});
```

---

### Ban Notification

**Listen:** `banned`

```javascript
socket.on('banned', (data) => {
  console.error('You are banned:', data.message);
  // data.banExpiresAt - ban expiry date
  // data.banReason - reason for ban
  // Logout user and show ban message
});
```

---

## Error Handling

### Standard Error Response

```json
{
  "success": false,
  "message": "Error message here"
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (banned user, admin only)
- `404` - Not Found
- `500` - Server Error

### Error Handling Example

```javascript
async function apiRequest(endpoint, method = 'GET', body = null) {
  const token = localStorage.getItem('fluxx_token');
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Request failed');
    }
    
    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}
```

---

## Best Practices

### 1. Token Management

```javascript
// Store token securely
localStorage.setItem('fluxx_token', token);

// Include token in all authenticated requests
const headers = {
  'Authorization': `Bearer ${localStorage.getItem('fluxx_token')}`
};

// Handle token expiration
socket.on('error', (data) => {
  if (data.message.includes('token') || data.message.includes('auth')) {
    // Redirect to login
    localStorage.removeItem('fluxx_token');
    window.location.href = '/login';
  }
});
```

---

### 2. Automatic Socket Connection

```javascript
// Connect socket automatically when user logs in
function initializeSocket() {
  const token = localStorage.getItem('fluxx_token');
  
  if (token) {
    const socket = io(API_BASE_URL.replace('/api', ''), {
      auth: { token }
    });
    
    setupSocketListeners(socket);
    return socket;
  }
  
  return null;
}
```

---

### 3. Queue Management

```javascript
// Automatic queue flow
function startVideo() {
  // 1. Start local video
  startLocalVideo();
  
  // 2. Automatically join queue
  socket.emit('join_queue');
  
  // 3. Wait for match
  socket.on('match_found', async (data) => {
    await startWebRTC(data.roomId, data.partnerId, true);
  });
}

// Next match - automatically rejoins queue
function nextMatch() {
  socket.emit('next_match');
  // User is automatically rejoined to queue
  // Wait for new match_found event
}
```

---

### 4. WebRTC Cleanup

```javascript
function cleanupWebRTC() {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }
  
  if (remoteStream) {
    remoteStream.getTracks().forEach(track => track.stop());
    remoteStream = null;
  }
}
```

---

### 5. Error Recovery

```javascript
// Handle connection errors
socket.on('error', (data) => {
  if (data.message.includes('banned')) {
    // Show ban message and logout
  } else if (data.message.includes('token')) {
    // Redirect to login
  } else {
    // Show generic error
  }
});

// Handle WebRTC connection failures
peerConnection.oniceconnectionstatechange = () => {
  if (peerConnection.iceConnectionState === 'failed') {
    // Attempt to restart ICE
    peerConnection.restartIce();
  }
};
```

---

## Complete Integration Example

```javascript
// fluxx-client.js
class FluxxClient {
  constructor(apiBaseUrl) {
    this.apiBaseUrl = apiBaseUrl;
    this.socket = null;
    this.token = localStorage.getItem('fluxx_token');
  }
  
  // Authentication
  async register(displayName, email, password) {
    const response = await fetch(`${this.apiBaseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName, email, password })
    });
    
    const data = await response.json();
    if (data.success) {
      this.token = data.data.token;
      localStorage.setItem('fluxx_token', this.token);
      this.connectSocket();
    }
    return data;
  }
  
  async login(email, password) {
    const response = await fetch(`${this.apiBaseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    if (data.success) {
      this.token = data.data.token;
      localStorage.setItem('fluxx_token', this.token);
      this.connectSocket();
    }
    return data;
  }
  
  // Socket.IO Connection
  connectSocket() {
    if (!this.token) return;
    
    this.socket = io(this.apiBaseUrl.replace('/api', ''), {
      auth: { token: this.token }
    });
    
    this.setupSocketListeners();
  }
  
  setupSocketListeners() {
    this.socket.on('connect', () => {
      console.log('Connected to Fluxx');
    });
    
    this.socket.on('match_found', (data) => {
      this.onMatchFound(data);
    });
    
    this.socket.on('partner_left', (data) => {
      this.onPartnerLeft(data);
    });
    
    // Add more listeners...
  }
  
  // Matchmaking
  joinQueue() {
    if (this.socket) {
      this.socket.emit('join_queue');
    }
  }
  
  nextMatch() {
    if (this.socket) {
      this.socket.emit('next_match');
    }
  }
  
  // WebRTC
  async startVideoChat(roomId, partnerId) {
    // Implement WebRTC logic
  }
}

// Usage
const client = new FluxxClient('http://localhost:5000/api');
```

---

## Testing

### Test Registration Flow

```javascript
// 1. Register
const registerResult = await client.register('testuser', 'test@example.com', 'password123');
console.log('OTP:', registerResult.data.otp);

// 2. Verify Email
await client.verifyEmail('test@example.com', registerResult.data.otp);

// 3. Login
await client.login('test@example.com', 'password123');

// 4. Start Video Chat
client.joinQueue();
```

---

## Support

For issues or questions:
- Check the API documentation at `/api-docs`
- Review error messages in responses
- Check server logs for detailed error information

---

**Last Updated:** 2024-01-01

