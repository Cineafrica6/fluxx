# WebRTC Troubleshooting Guide

## Issue: Remote Video Not Displaying in Production

### Symptoms
- Users are matched successfully
- WebRTC offers and answers are exchanged
- Connection shows "connecting" spinner
- Remote video never appears

### Root Causes

1. **ICE Candidates Not Exchanging**
   - ICE candidates are required for NAT traversal
   - If candidates aren't exchanged, connection can't establish
   - Check backend logs for ICE candidate messages

2. **TURN Server Issues**
   - Free TURN servers may be rate-limited
   - Some networks block TURN connections
   - Need reliable TURN servers for production

3. **Network/Firewall Restrictions**
   - Some networks block WebRTC traffic
   - Corporate firewalls may interfere
   - Railway's network may have restrictions

### Debugging Steps

#### 1. Check Backend Logs

Look for these log messages:
```
🧊 ICE candidate sent: userId1 -> userId2
📡 WebRTC offer sent: userId1 -> userId2
📡 WebRTC answer sent: userId1 -> userId2
```

**If you don't see ICE candidate logs:**
- Frontend isn't sending ICE candidates
- Check browser console for WebRTC errors
- Verify `peerConnection.onicecandidate` is firing

#### 2. Check Frontend Console

Open browser DevTools and look for:
- WebRTC connection state changes
- ICE connection state changes
- Any WebRTC errors

#### 3. Test Connection States

Add this to your frontend WebRTC code:

```javascript
// Monitor connection states
peerConnection.onconnectionstatechange = () => {
  const state = peerConnection.connectionState;
  console.log('Connection state:', state);
  
  if (state === 'connected') {
    console.log('✅ WebRTC connected!');
  } else if (state === 'failed') {
    console.error('❌ WebRTC connection failed');
  } else if (state === 'disconnected') {
    console.warn('⚠️ WebRTC disconnected');
  }
};

peerConnection.oniceconnectionstatechange = () => {
  const state = peerConnection.iceConnectionState;
  console.log('ICE state:', state);
  
  if (state === 'failed') {
    console.error('❌ ICE connection failed - trying restart');
    peerConnection.restartIce();
  }
};
```

### Solutions

#### Solution 1: Add Better TURN Servers

The free TURN servers may be unreliable. Consider:

1. **Metered.ca TURN** (Free tier available)
   - Sign up at metered.ca
   - Get TURN credentials
   - Update `rtcConfig` in frontend

2. **Twilio STUN/TURN** (Paid, reliable)
   - Sign up at twilio.com
   - Get TURN credentials
   - Very reliable for production

3. **Self-hosted TURN** (Advanced)
   - Use coturn on your own server
   - Full control but requires maintenance

#### Solution 2: Improve ICE Candidate Handling

Ensure ICE candidates are being sent and received:

```javascript
// Frontend: Send ICE candidates
peerConnection.onicecandidate = (event) => {
  if (event.candidate && socket && currentRoomId) {
    console.log('Sending ICE candidate:', event.candidate.candidate);
    socket.emit('ice_candidate', {
      candidate: event.candidate,
      roomId: currentRoomId
    });
  } else if (!event.candidate) {
    console.log('All ICE candidates gathered');
  }
};

// Frontend: Receive ICE candidates
socket.on('ice_candidate', async (data) => {
  console.log('Received ICE candidate:', data.candidate?.candidate);
  if (peerConnection && data.candidate) {
    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
      console.log('✅ ICE candidate added');
    } catch (error) {
      console.error('❌ Error adding ICE candidate:', error);
    }
  }
});
```

#### Solution 3: Add Connection Timeout

If connection doesn't establish within 30 seconds, restart:

```javascript
let connectionTimeout;

function startConnectionTimeout() {
  connectionTimeout = setTimeout(() => {
    const state = peerConnection?.connectionState;
    const iceState = peerConnection?.iceConnectionState;
    
    if (state !== 'connected' && iceState !== 'connected') {
      console.warn('Connection timeout - restarting ICE');
      peerConnection?.restartIce();
      
      // Retry once
      setTimeout(() => {
        if (peerConnection?.connectionState !== 'connected') {
          console.error('Connection failed after retry');
          // Show error to user
          showError('Connection failed. Please try again.');
        }
      }, 10000);
    }
  }, 30000); // 30 seconds
}

// Call this when starting WebRTC
startConnectionTimeout();

// Clear timeout when connected
peerConnection.onconnectionstatechange = () => {
  if (peerConnection.connectionState === 'connected') {
    clearTimeout(connectionTimeout);
  }
};
```

#### Solution 4: Use Trickle ICE

Ensure ICE candidates are sent as soon as they're discovered (trickle ICE):

```javascript
// This should already be happening, but verify:
peerConnection.onicecandidate = (event) => {
  if (event.candidate) {
    // Send immediately (trickle ICE)
    socket.emit('ice_candidate', {
      candidate: event.candidate,
      roomId: currentRoomId
    });
  }
};
```

### Quick Fix: Add More Logging

Add comprehensive logging to identify the issue:

```javascript
// Frontend: Add detailed logging
peerConnection.onicecandidate = (event) => {
  if (event.candidate) {
    console.log('ICE Candidate:', {
      candidate: event.candidate.candidate,
      sdpMLineIndex: event.candidate.sdpMLineIndex,
      sdpMid: event.candidate.sdpMid
    });
    
    socket.emit('ice_candidate', {
      candidate: event.candidate,
      roomId: currentRoomId
    });
  } else {
    console.log('✅ All ICE candidates gathered');
  }
};

peerConnection.oniceconnectionstatechange = () => {
  console.log('ICE Connection State:', peerConnection.iceConnectionState);
  console.log('Connection State:', peerConnection.connectionState);
  
  // Log ICE gathering state
  console.log('ICE Gathering State:', peerConnection.iceGatheringState);
};

peerConnection.onconnectionstatechange = () => {
  console.log('Connection State Changed:', peerConnection.connectionState);
  
  if (peerConnection.connectionState === 'failed') {
    console.error('Connection failed - attempting ICE restart');
    peerConnection.restartIce();
  }
};
```

### Production Checklist

- [ ] Verify ICE candidates are being logged in backend
- [ ] Check browser console for WebRTC errors
- [ ] Test with different networks (mobile, WiFi, etc.)
- [ ] Verify TURN servers are accessible
- [ ] Add connection timeout handling
- [ ] Monitor connection state changes
- [ ] Test with users in different locations

### Next Steps

1. **Deploy the updated logging** - This will help identify the exact issue
2. **Check backend logs** - Look for ICE candidate messages
3. **Check frontend console** - Look for WebRTC state changes
4. **Test with updated code** - See if logging reveals the issue
5. **Consider paid TURN service** - If free servers are the issue

### Contact Points

If issue persists:
1. Check Railway logs for ICE candidate messages
2. Check browser console for WebRTC errors
3. Test connection states with the code above
4. Consider upgrading TURN server configuration

