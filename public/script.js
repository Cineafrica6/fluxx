// Dynamically detect API URL based on current origin
// Works for both localhost and deployed environments (Railway, etc.)
const API_URL = window.location.origin;
console.log('API URL:', API_URL);
let token = localStorage.getItem('fluxx_token') || null;
let currentUser = null;
let socket = null;
let localStream = null;
let remoteStream = null;
let peerConnection = null;
let currentRoomId = null;

// WebRTC Configuration with TURN servers for better connectivity
const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
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
    iceCandidatePoolSize: 10
};

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    updateStatusBar();
    if (token) {
        getMe();
    }
});

// ========== Tab Management ==========
function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
}

// ========== Status Bar ==========
function updateStatusBar() {
    document.getElementById('tokenStatus').textContent = token ? 'Logged in ✅' : 'Not logged in ❌';
    document.getElementById('userStatus').textContent = currentUser ? currentUser.displayName : '-';
    document.getElementById('socketStatus').textContent = socket && socket.connected ? 'Connected ✅' : 'Disconnected ❌';
}

// ========== API Helper ==========
async function apiRequest(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        }
    };

    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, options);
        const data = await response.json();
        
        displayResponse({ status: response.status, data });
        
        return { ok: response.ok, data };
    } catch (error) {
        displayResponse({ error: error.message });
        return { ok: false, error };
    }
}

function displayResponse(data) {
    const responseBox = document.getElementById('response');
    responseBox.textContent = JSON.stringify(data, null, 2);
}

function clearResponse() {
    document.getElementById('response').textContent = '';
}

function copyResponse() {
    const responseBox = document.getElementById('response');
    navigator.clipboard.writeText(responseBox.textContent);
    alert('Response copied to clipboard!');
}

function clearAllData() {
    if (confirm('Clear all data (token, user info)?')) {
        localStorage.clear();
        token = null;
        currentUser = null;
        updateStatusBar();
        alert('All data cleared!');
    }
}

// ========== Authentication ==========
async function register(event) {
    event.preventDefault();
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    const result = await apiRequest('/api/auth/register', 'POST', { email, password });
    
    if (result.ok) {
        token = result.data.data.token;
        localStorage.setItem('fluxx_token', token);
        currentUser = result.data.data.user;
        updateStatusBar();
        
        // Display OTP if provided
        if (result.data.data.otp) {
            displayOTP(result.data.data.otp);
            // Auto-fill email in verify form
            document.getElementById('verifyEmailInput').value = email;
        }
        
        alert('Registration successful! Use the OTP displayed below to verify your email.');
    }
}

async function login(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    const result = await apiRequest('/api/auth/login', 'POST', { email, password });
    
    if (result.ok) {
        token = result.data.data.token;
        localStorage.setItem('fluxx_token', token);
        currentUser = result.data.data.user;
        updateStatusBar();
        alert('Login successful!');
    }
}

async function verifyEmail(event) {
    event.preventDefault();
    const email = document.getElementById('verifyEmailInput').value;
    const otp = document.getElementById('verifyOTP').value;

    if (!email || !otp) {
        alert('Please enter both email and OTP');
        return;
    }

    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
        alert('OTP must be exactly 6 digits');
        return;
    }

    const result = await apiRequest('/api/auth/verify-email', 'POST', { email, otp });
    
    if (result.ok) {
        alert('Email verified successfully!');
        // Clear the form
        document.getElementById('verifyEmailForm').reset();
        // Hide OTP display
        const otpDisplay = document.getElementById('otpDisplay');
        if (otpDisplay) {
            otpDisplay.style.display = 'none';
        }
        // Refresh user data
        if (token) {
            getMe();
        }
    }
}

async function resendOTP() {
    const email = document.getElementById('verifyEmailInput').value || document.getElementById('registerEmail').value;
    
    if (!email) {
        alert('Please enter your email address first');
        return;
    }

    const result = await apiRequest('/api/auth/resend-otp', 'POST', { email });
    
    if (result.ok) {
        // Display OTP if provided
        if (result.data.data && result.data.data.otp) {
            displayOTP(result.data.data.otp);
        }
        alert('OTP sent successfully! Check the OTP displayed below.');
    }
}

function displayOTP(otp) {
    const otpDisplay = document.getElementById('otpDisplay');
    const otpCode = document.getElementById('otpCode');
    
    if (otpDisplay && otpCode) {
        otpCode.textContent = otp;
        otpDisplay.style.display = 'block';
        
        // Scroll to OTP display
        otpDisplay.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        // Auto-fill OTP input
        const otpInput = document.getElementById('verifyOTP');
        if (otpInput) {
            otpInput.value = otp;
            otpInput.focus();
        }
    }
}

async function getMe() {
    const result = await apiRequest('/api/auth/me', 'GET');
    
    if (result.ok) {
        currentUser = result.data.data;
        updateStatusBar();
    }
}

// ========== User Operations ==========
async function getUserProfile(event) {
    event.preventDefault();
    const userId = document.getElementById('getUserId').value;

    await apiRequest(`/api/users/${userId}`, 'GET');
}

// ========== Reports ==========
async function submitReport(event) {
    event.preventDefault();
    const reportedUserId = document.getElementById('reportUserId').value;
    const reason = document.getElementById('reportReason').value;
    const additionalDetails = document.getElementById('reportDetails').value;

    await apiRequest('/api/reports', 'POST', {
        reportedUserId,
        reason,
        additionalDetails
    });
}

async function getMyReportStats() {
    await apiRequest('/api/reports/me', 'GET');
}

// ========== Admin Operations ==========
async function getDashboardStats() {
    await apiRequest('/api/admin/stats', 'GET');
}

async function getAllReports(event) {
    event.preventDefault();
    const status = document.getElementById('reportStatusFilter').value;
    const query = status ? `?status=${status}` : '';

    await apiRequest(`/api/admin/reports${query}`, 'GET');
}

async function getAllUsers(event) {
    event.preventDefault();
    const banned = document.getElementById('bannedFilter').value;
    const query = banned ? `?banned=${banned}` : '';

    await apiRequest(`/api/admin/users${query}`, 'GET');
}

async function banUser(event) {
    event.preventDefault();
    const userId = document.getElementById('banUserId').value;
    const reason = document.getElementById('banReason').value;

    await apiRequest(`/api/admin/users/${userId}/ban`, 'POST', { reason });
}

async function unbanUser(event) {
    event.preventDefault();
    const userId = document.getElementById('unbanUserId').value;

    await apiRequest(`/api/admin/users/${userId}/unban`, 'POST');
}

// ========== Socket Connection ==========
function connectSocket() {
    if (!token) {
        alert('Please login first!');
        return;
    }

    socket = io(API_URL, {
        auth: { token }
    });

    socket.on('connect', () => {
        logSocket('Connected to server', 'success');
        updateStatusBar();
        updateSocketButtons(true);
    });

    socket.on('disconnect', () => {
        logSocket('Disconnected from server', 'error');
        updateStatusBar();
        updateSocketButtons(false);
    });

    socket.on('error', (data) => {
        logSocket(`Error: ${data.message}`, 'error');
    });

    // Matchmaking events
    socket.on('queue_joined', (data) => {
        logSocket(`Queue joined: ${data.message}`, 'info');
        document.getElementById('leaveQueueBtn').disabled = false;
    });

    socket.on('queue_left', (data) => {
        logSocket(`Queue left: ${data.message}`, 'info');
        document.getElementById('leaveQueueBtn').disabled = true;
    });

    socket.on('match_found', async (data) => {
        logSocket(`Match found! Room: ${data.roomId}`, 'success');
        currentRoomId = data.roomId;
        document.getElementById('nextMatchBtn').disabled = false;
        document.getElementById('endChatBtn').disabled = false;
        
        // Start WebRTC
        await startWebRTC(true); // initiator
    });

    socket.on('match_ended', (data) => {
        logSocket(`Match ended: ${data.reason}`, 'info');
        cleanupWebRTC();
    });

    socket.on('partner_left', (data) => {
        logSocket(`Partner left: ${data.reason}`, 'info');
        cleanupWebRTC();
    });

    socket.on('partner_disconnected', (data) => {
        logSocket('Partner disconnected', 'error');
        cleanupWebRTC();
    });

    socket.on('banned', (data) => {
        logSocket(`You are banned: ${data.message}`, 'error');
        alert(`You are banned: ${data.message}`);
    });

    // WebRTC signaling
    socket.on('webrtc_offer', async (data) => {
        logSocket('Received WebRTC offer', 'info');
        await handleOffer(data.offer);
    });

    socket.on('webrtc_answer', async (data) => {
        logSocket('Received WebRTC answer', 'info');
        await handleAnswer(data.answer);
    });

    socket.on('ice_candidate', async (data) => {
        await handleIceCandidate(data.candidate);
    });
}

function disconnectSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
        updateStatusBar();
        updateSocketButtons(false);
    }
}

function updateSocketButtons(connected) {
    document.getElementById('connectBtn').disabled = connected;
    document.getElementById('disconnectBtn').disabled = !connected;
    document.getElementById('joinQueueBtn').disabled = !connected;
    
    if (!connected) {
        document.getElementById('leaveQueueBtn').disabled = true;
        document.getElementById('nextMatchBtn').disabled = true;
        document.getElementById('endChatBtn').disabled = true;
    }
}

function logSocket(message, type = 'info') {
    const logContainer = document.getElementById('socketLog');
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logContainer.appendChild(entry);
    logContainer.scrollTop = logContainer.scrollHeight;
    
    console.log(message);
}

// ========== Matchmaking ==========
function joinQueue() {
    if (socket && socket.connected) {
        socket.emit('join_queue');
        logSocket('Joining matchmaking queue...', 'info');
    }
}

function leaveQueue() {
    if (socket && socket.connected) {
        socket.emit('leave_queue');
        logSocket('Leaving matchmaking queue...', 'info');
    }
}

function nextMatch() {
    if (socket && socket.connected) {
        socket.emit('next_match');
        logSocket('Looking for next match...', 'info');
        cleanupWebRTC();
    }
}

function endChat() {
    if (socket && socket.connected) {
        socket.emit('end_chat');
        logSocket('Ending chat...', 'info');
        cleanupWebRTC();
        document.getElementById('nextMatchBtn').disabled = true;
        document.getElementById('endChatBtn').disabled = true;
    }
}

// ========== Video Chat ==========
async function startLocalVideo() {
    try {
        // If we already have a stream, stop it first
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }
        
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });

        document.getElementById('localVideo').srcObject = localStream;
        logSocket('Local video started', 'success');
        
        // If peer connection exists, replace tracks
        if (peerConnection) {
            replaceLocalTracks();
        }
    } catch (error) {
        logSocket(`Failed to start video: ${error.message}`, 'error');
        alert('Failed to access camera/microphone. Please grant permissions.');
    }
}

function stopLocalVideo() {
    if (localStream) {
        // Stop all tracks
        localStream.getTracks().forEach(track => {
            track.stop();
            // Remove track from peer connection if it exists
            if (peerConnection) {
                const sender = peerConnection.getSenders().find(s => s.track === track);
                if (sender) {
                    peerConnection.removeTrack(sender);
                    logSocket(`Removed ${track.kind} track from peer connection`, 'info');
                }
            }
        });
        
        document.getElementById('localVideo').srcObject = null;
        localStream = null;
        logSocket('Local video stopped', 'info');
        
        // If peer connection exists, we need to renegotiate or send empty tracks
        if (peerConnection && peerConnection.signalingState !== 'closed') {
            // Create a new offer to notify remote peer
            renegotiateConnection();
        }
    }
}

// Replace local tracks in peer connection
async function replaceLocalTracks() {
    if (!peerConnection || !localStream) {
        return;
    }
    
    try {
        const senders = peerConnection.getSenders();
        const newTracks = localStream.getTracks();
        
        // Replace existing tracks
        for (const sender of senders) {
            if (sender.track) {
                const trackKind = sender.track.kind;
                const newTrack = newTracks.find(t => t.kind === trackKind);
                
                if (newTrack) {
                    await sender.replaceTrack(newTrack);
                    logSocket(`Replaced ${trackKind} track in peer connection`, 'info');
                }
            }
        }
        
        // Add any new tracks that don't have senders yet
        for (const track of newTracks) {
            const hasSender = senders.some(s => s.track && s.track.kind === track.kind);
            if (!hasSender) {
                peerConnection.addTrack(track, localStream);
                logSocket(`Added new ${track.kind} track to peer connection`, 'info');
            }
        }
    } catch (error) {
        logSocket(`Error replacing tracks: ${error.message}`, 'error');
    }
}

// Renegotiate connection when tracks change
async function renegotiateConnection() {
    if (!peerConnection || !currentRoomId || !socket) {
        return;
    }
    
    try {
        // Only renegotiate if connection is stable
        const signalingState = peerConnection.signalingState;
        logSocket(`Renegotiating connection (current state: ${signalingState})`, 'info');
        
        if (signalingState === 'stable' || signalingState === 'have-local-offer' || signalingState === 'have-remote-offer') {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            
            socket.emit('webrtc_offer', {
                offer: offer,
                roomId: currentRoomId
            });
            
            logSocket('Renegotiation offer sent', 'info');
        } else {
            logSocket(`Cannot renegotiate in state: ${signalingState}`, 'warn');
        }
    } catch (error) {
        logSocket(`Error renegotiating: ${error.message}`, 'error');
    }
}

async function startWebRTC(isInitiator) {
    // Make sure we have local stream
    if (!localStream) {
        await startLocalVideo();
    }

    // Initialize remote stream early - but don't set srcObject yet
    if (!remoteStream) {
        remoteStream = new MediaStream();
    }
    
    // Track if we've set up the video element and the stream reference
    let videoElementSetup = false;
    let remoteStreamReference = null;

    // Create peer connection
    peerConnection = new RTCPeerConnection(rtcConfig);

    // Add local stream tracks
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
        logSocket(`Added local track: ${track.kind}`, 'info');
    });
    
    // Store reference to local stream for track replacement
    peerConnection._localStream = localStream;

    // Handle remote stream - this fires when remote tracks are received
    peerConnection.ontrack = (event) => {
        logSocket(`Received remote track: ${event.track.kind}`, 'info');
        
        const remoteVideo = document.getElementById('remoteVideo');
        let streamToUse = null;
        
        if (event.streams && event.streams.length > 0) {
            // Use the stream from the event (preferred method)
            streamToUse = event.streams[0];
            // Store reference to avoid setting srcObject multiple times
            if (!remoteStreamReference) {
                remoteStreamReference = streamToUse;
            }
            logSocket(`Using stream from event (${streamToUse.getTracks().length} tracks)`, 'info');
        } else if (event.track) {
            // Fallback: add track to our remote stream
            // Check if track already exists (replacement scenario)
            const existingTrack = remoteStream.getTracks().find(t => t.kind === event.track.kind);
            if (existingTrack) {
                // Remove old track and add new one (track replacement)
                remoteStream.removeTrack(existingTrack);
                existingTrack.stop(); // Stop the old track
                logSocket(`Replaced existing ${event.track.kind} track`, 'info');
            }
            remoteStream.addTrack(event.track);
            streamToUse = remoteStream;
            if (!remoteStreamReference) {
                remoteStreamReference = streamToUse;
            }
            logSocket(`Added track to stream (${remoteStream.getTracks().length} tracks)`, 'info');
        }
        
        // Handle track replacement - if this is a replacement, update the video element
        if (event.track.kind === 'video' && videoElementSetup && remoteVideo.srcObject) {
            // Track was replaced, ensure video element is updated
            logSocket('Video track replaced, updating video element', 'info');
            // The stream should automatically update, but force a refresh if needed
            if (remoteVideo.readyState === 0 || remoteVideo.paused) {
                setTimeout(() => {
                    playRemoteVideo();
                }, 100);
            }
        }
        
        // Only set srcObject ONCE, using the stored reference
        // This prevents "play() request was interrupted" errors
        if (remoteStreamReference && !videoElementSetup) {
            // Ensure video element attributes are set correctly
            remoteVideo.setAttribute('playsinline', 'true');
            remoteVideo.setAttribute('autoplay', 'true');
            remoteVideo.muted = false; // Don't mute remote video
            
            remoteVideo.srcObject = remoteStreamReference;
            videoElementSetup = true;
            logSocket('Remote stream assigned to video element (one-time setup)', 'success');
            logSocket(`Stream has ${remoteStreamReference.getTracks().length} tracks`, 'info');
            
            // Log all tracks in the stream
            remoteStreamReference.getTracks().forEach((track, idx) => {
                logSocket(`Stream track ${idx}: ${track.kind}, enabled=${track.enabled}, muted=${track.muted}, readyState=${track.readyState}`, 'info');
            });
            
            // Set up video element event handlers (only once)
            remoteVideo.onloadedmetadata = () => {
                logSocket('Remote video metadata loaded', 'success');
                playRemoteVideo();
            };
            
            remoteVideo.onloadeddata = () => {
                logSocket('Remote video data loaded', 'success');
                playRemoteVideo();
            };
            
            remoteVideo.oncanplay = () => {
                logSocket('Remote video can play', 'success');
                playRemoteVideo();
            };
            
            remoteVideo.oncanplaythrough = () => {
                logSocket('Remote video can play through', 'success');
                playRemoteVideo();
            };
            
            remoteVideo.onplay = () => {
                logSocket('Remote video started playing', 'success');
            };
            
            remoteVideo.onplaying = () => {
                logSocket('Remote video is playing', 'success');
            };
            
            remoteVideo.onerror = (error) => {
                logSocket(`Remote video error: ${error}`, 'error');
            };
            
            // Force load the video
            remoteVideo.load();
            
            // Try to play immediately and on multiple intervals
            const tryPlay = () => {
                logSocket(`Attempting play (readyState: ${remoteVideo.readyState})`, 'info');
                playRemoteVideo();
            };
            
            // Try immediately
            tryPlay();
            
            // Try after delays
            setTimeout(tryPlay, 100);
            setTimeout(tryPlay, 500);
            setTimeout(tryPlay, 1000);
            setTimeout(tryPlay, 2000);
            setTimeout(tryPlay, 3000);
            
            // Also set up a periodic check when connection is established
            const playCheckInterval = setInterval(() => {
                const connState = peerConnection?.connectionState;
                const iceState = peerConnection?.iceConnectionState;
                
                if (connState === 'connected' && (iceState === 'connected' || iceState === 'completed')) {
                    if (remoteVideo.readyState === 0 && remoteVideo.srcObject) {
                        logSocket('Connection established but video not loaded, forcing play...', 'info');
                        tryPlay();
                    } else if (remoteVideo.paused) {
                        logSocket('Video is paused, attempting to play...', 'info');
                        tryPlay();
                    }
                }
                
                // Clear interval after 10 seconds
                setTimeout(() => clearInterval(playCheckInterval), 10000);
            }, 500);
        }
        
        // Log track details
        logSocket(`Track readyState: ${event.track.readyState}, enabled: ${event.track.enabled}`, 'info');
        
        // Handle track ended
        event.track.onended = () => {
            logSocket(`Remote ${event.track.kind} track ended`, 'info');
        };
        
        // Handle track mute/unmute
        event.track.onmute = () => {
            logSocket(`Remote ${event.track.kind} track muted`, 'warn');
            // Track getting muted might indicate connection issues
            if (event.track.kind === 'video') {
                // Check connection state
                const iceState = peerConnection.iceConnectionState;
                const connState = peerConnection.connectionState;
                logSocket(`Track muted - ICE: ${iceState}, Connection: ${connState}`, 'warn');
                
                // Immediately try to unmute the track
                if (event.track.muted) {
                    // Can't directly unmute a track, but we can ensure it's enabled
                    event.track.enabled = true;
                    logSocket('Re-enabled video track', 'info');
                }
                
                // Try to unmute video element and play
                setTimeout(() => {
                    const remoteVideo = document.getElementById('remoteVideo');
                    if (remoteVideo && remoteVideo.srcObject) {
                        // Force unmute
                        remoteVideo.muted = false;
                        // Force reload if needed
                        if (remoteVideo.readyState === 0) {
                            logSocket('Video not loaded, forcing load...', 'info');
                            remoteVideo.load();
                        }
                        playRemoteVideo();
                    }
                }, 100);
                
                // Also retry after connection stabilizes
                setTimeout(() => {
                    if (peerConnection.iceConnectionState === 'connected' || 
                        peerConnection.iceConnectionState === 'completed') {
                        const remoteVideo = document.getElementById('remoteVideo');
                        if (remoteVideo) {
                            remoteVideo.muted = false;
                            playRemoteVideo();
                        }
                    }
                }, 1000);
            }
        };
        
        event.track.onunmute = () => {
            logSocket(`Remote ${event.track.kind} track unmuted`, 'info');
            if (event.track.kind === 'video' && videoElementSetup) {
                // Track unmuted, ensure video element is ready and play
                const remoteVideo = document.getElementById('remoteVideo');
                if (remoteVideo) {
                    remoteVideo.muted = false;
                    // If video hasn't loaded, force load
                    if (remoteVideo.readyState === 0) {
                        remoteVideo.load();
                    }
                    setTimeout(() => {
                        playRemoteVideo();
                    }, 100);
                }
            }
        };
    };
    
    // Helper function to play remote video
    function playRemoteVideo() {
        const remoteVideo = document.getElementById('remoteVideo');
        if (!remoteVideo || !remoteVideo.srcObject) {
            logSocket('Cannot play: video element or stream missing', 'warn');
            return;
        }
        
        // Check connection state - don't try to play if connection is completely failed
        const connState = peerConnection.connectionState;
        const iceState = peerConnection.iceConnectionState;
        
        if (connState === 'failed' && iceState === 'failed') {
            logSocket('Connection failed, cannot play video', 'error');
            return;
        }
        
        // Check if stream has video tracks
        const stream = remoteVideo.srcObject;
        const videoTracks = stream.getVideoTracks();
        logSocket(`Stream has ${videoTracks.length} video track(s)`, 'info');
        
        if (videoTracks.length === 0) {
            logSocket('No video tracks in stream', 'warn');
            return;
        }
        
        // Log video track state and ensure tracks are enabled
        videoTracks.forEach((track, index) => {
            logSocket(`Video track ${index}: readyState=${track.readyState}, enabled=${track.enabled}, muted=${track.muted}`, 'info');
            // Ensure track is enabled
            if (!track.enabled) {
                track.enabled = true;
                logSocket(`Enabled video track ${index}`, 'info');
            }
        });
        
        // Ensure video is not muted
        remoteVideo.muted = false;
        
        // Ensure all video tracks are enabled and not muted
        videoTracks.forEach((track, index) => {
            if (!track.enabled) {
                track.enabled = true;
                logSocket(`Enabled video track ${index}`, 'info');
            }
        });
        
        // Check if video has loaded any data
        const readyState = remoteVideo.readyState;
        logSocket(`Attempting to play video (readyState: ${readyState}, connection: ${connState}, ICE: ${iceState})`, 'info');
        
        // If readyState is 0, try to force load
        if (readyState === 0) {
            logSocket('Video readyState is 0, attempting to load...', 'info');
            remoteVideo.load();
            // Wait a bit for load to process
            setTimeout(() => {
                logSocket(`Video readyState after load: ${remoteVideo.readyState}`, 'info');
            }, 100);
        }
        
        // Try to play - even if readyState is 0, sometimes it works
        const playPromise = remoteVideo.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                logSocket('Remote video is playing!', 'success');
                // Check dimensions after a short delay
                setTimeout(() => {
                    const width = remoteVideo.videoWidth;
                    const height = remoteVideo.videoHeight;
                    if (width > 0 && height > 0) {
                        logSocket(`Video dimensions: ${width}x${height}`, 'success');
                    } else {
                        logSocket('Video playing but no dimensions yet', 'info');
                    }
                }, 500);
            }).catch(error => {
                logSocket(`Failed to play remote video: ${error.message}`, 'error');
                // Only retry if connection is not completely failed
                if (connState !== 'failed' && iceState !== 'failed') {
                    // Try multiple retries with increasing delays
                    const retries = [500, 1000, 2000];
                    retries.forEach((delay, index) => {
                        setTimeout(() => {
                            logSocket(`Retry ${index + 1} play...`, 'info');
                            remoteVideo.play().then(() => {
                                logSocket(`Remote video playing on retry ${index + 1}!`, 'success');
                            }).catch(err => {
                                if (index === retries.length - 1) {
                                    logSocket(`All retries failed: ${err.message}`, 'error');
                                }
                            });
                        }, delay);
                    });
                }
            });
        }
    }

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
        const state = peerConnection.connectionState;
        logSocket(`Connection state: ${state}`, 'info');
        
        if (state === 'connected') {
            logSocket('WebRTC connection established!', 'success');
            // Ensure video plays when connected
            setTimeout(() => {
                playRemoteVideo();
            }, 500);
        } else if (state === 'failed') {
            logSocket('WebRTC connection failed - attempting recovery', 'error');
            // Try to recover by restarting ICE
            try {
                peerConnection.restartIce();
                logSocket('ICE restart initiated', 'info');
            } catch (err) {
                logSocket(`Failed to restart ICE: ${err.message}`, 'error');
            }
        } else if (state === 'disconnected') {
            logSocket('WebRTC connection disconnected', 'warn');
        }
    };

    // Handle ICE connection state
    peerConnection.oniceconnectionstatechange = () => {
        const state = peerConnection.iceConnectionState;
        logSocket(`ICE connection state: ${state}`, 'info');
        
        if (state === 'failed' || state === 'disconnected') {
            logSocket('ICE connection failed, attempting to restart ICE...', 'warn');
            // Try to restart ICE
            peerConnection.restartIce();
            
            // Also try to play video even if connection is having issues
            setTimeout(() => {
                playRemoteVideo();
            }, 1000);
        } else if (state === 'connected' || state === 'completed') {
            logSocket('ICE connection successful!', 'success');
            // Connection is good, ensure video is playing
            setTimeout(() => {
                playRemoteVideo();
            }, 500);
        }
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
        if (event.candidate && socket && currentRoomId) {
            socket.emit('ice_candidate', {
                candidate: event.candidate,
                roomId: currentRoomId
            });
            logSocket('ICE candidate sent', 'info');
        } else if (!event.candidate) {
            logSocket('All ICE candidates sent', 'info');
        }
    };

    // If initiator, create offer
    if (isInitiator) {
        try {
            const offer = await peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });
            await peerConnection.setLocalDescription(offer);
            
            socket.emit('webrtc_offer', {
                offer: offer,
                roomId: currentRoomId
            });
            
            logSocket('WebRTC offer sent', 'info');
        } catch (error) {
            logSocket(`Error creating offer: ${error.message}`, 'error');
        }
    }
}

async function handleOffer(offer) {
    try {
        if (!peerConnection) {
            await startWebRTC(false);
        }

        // Check if we're already processing this offer
        if (peerConnection.signalingState !== 'stable' && peerConnection.signalingState !== 'have-local-offer') {
            logSocket(`Cannot set remote offer, current state: ${peerConnection.signalingState}`, 'warn');
            return;
        }

        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        logSocket('Remote description set (offer)', 'info');
        
        const answer = await peerConnection.createAnswer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
        });
        await peerConnection.setLocalDescription(answer);
        
        socket.emit('webrtc_answer', {
            answer: answer,
            roomId: currentRoomId
        });
        
        logSocket('WebRTC answer sent', 'info');
    } catch (error) {
        logSocket(`Error handling offer: ${error.message}`, 'error');
    }
}

async function handleAnswer(answer) {
    try {
        if (!peerConnection) {
            logSocket('No peer connection when handling answer', 'error');
            return;
        }

        // Only set remote description if we're in the correct state (have-local-offer)
        const currentState = peerConnection.signalingState;
        logSocket(`Current signaling state: ${currentState}`, 'info');
        
        if (currentState !== 'have-local-offer') {
            if (currentState === 'stable') {
                // Connection might already be established via ICE candidates
                logSocket('Connection already stable - may be connected via ICE', 'info');
                // Check if we already have remote tracks
                const receivers = peerConnection.getReceivers();
                if (receivers.length > 0) {
                    logSocket(`Already have ${receivers.length} remote track(s), connection likely established`, 'success');
                }
                return;
            }
            logSocket(`Cannot set remote answer, current state: ${currentState}, expected: have-local-offer`, 'warn');
            return;
        }

        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        logSocket('Answer remote description set', 'info');
        logSocket('WebRTC connection established', 'success');
    } catch (error) {
        logSocket(`Error handling answer: ${error.message}`, 'error');
        // If error is about wrong state but we have tracks, connection might still work
        if (error.message.includes('wrong state') && peerConnection.getReceivers().length > 0) {
            logSocket('Connection may still work despite state error', 'info');
        }
    }
}

async function handleIceCandidate(candidate) {
    try {
        if (peerConnection && candidate) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            logSocket('ICE candidate added', 'info');
        }
    } catch (error) {
        logSocket(`Error adding ICE candidate: ${error.message}`, 'error');
    }
}

function cleanupWebRTC() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    
    if (remoteStream) {
        document.getElementById('remoteVideo').srcObject = null;
        remoteStream = null;
    }
    
    currentRoomId = null;
    logSocket('WebRTC connection closed', 'info');
}