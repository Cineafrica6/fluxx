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

// WebRTC Configuration
const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
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
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });

        document.getElementById('localVideo').srcObject = localStream;
        logSocket('Local video started', 'success');
    } catch (error) {
        logSocket(`Failed to start video: ${error.message}`, 'error');
        alert('Failed to access camera/microphone. Please grant permissions.');
    }
}

function stopLocalVideo() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        document.getElementById('localVideo').srcObject = null;
        localStream = null;
        logSocket('Local video stopped', 'info');
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

    // Add local stream
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
        logSocket(`Added local track: ${track.kind}`, 'info');
    });

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
            remoteStream.addTrack(event.track);
            streamToUse = remoteStream;
            if (!remoteStreamReference) {
                remoteStreamReference = streamToUse;
            }
            logSocket(`Added track to stream (${remoteStream.getTracks().length} tracks)`, 'info');
        }
        
        // Only set srcObject ONCE, using the stored reference
        // This prevents "play() request was interrupted" errors
        if (remoteStreamReference && !videoElementSetup) {
            remoteVideo.srcObject = remoteStreamReference;
            videoElementSetup = true;
            logSocket('Remote stream assigned to video element (one-time setup)', 'success');
            logSocket(`Stream has ${remoteStreamReference.getTracks().length} tracks`, 'info');
            
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
            
            remoteVideo.onerror = (error) => {
                logSocket(`Remote video error: ${error}`, 'error');
            };
            
            // Try to play immediately if metadata is already loaded
            if (remoteVideo.readyState >= 2) { // HAVE_CURRENT_DATA
                playRemoteVideo();
            } else {
                // If not ready, try after a short delay
                setTimeout(() => {
                    logSocket(`Video readyState after delay: ${remoteVideo.readyState}`, 'info');
                    playRemoteVideo();
                }, 500);
                
                // Also try after a longer delay as fallback
                setTimeout(() => {
                    logSocket(`Video readyState after longer delay: ${remoteVideo.readyState}`, 'info');
                    playRemoteVideo();
                }, 2000);
            }
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
            // Try to unmute the video element if track gets muted
            if (event.track.kind === 'video') {
                setTimeout(() => {
                    const remoteVideo = document.getElementById('remoteVideo');
                    if (remoteVideo) {
                        remoteVideo.muted = false;
                        playRemoteVideo();
                    }
                }, 100);
            }
        };
        
        event.track.onunmute = () => {
            logSocket(`Remote ${event.track.kind} track unmuted`, 'info');
            if (event.track.kind === 'video' && videoElementSetup) {
                playRemoteVideo();
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
        
        // Check if stream has video tracks
        const stream = remoteVideo.srcObject;
        const videoTracks = stream.getVideoTracks();
        logSocket(`Stream has ${videoTracks.length} video track(s)`, 'info');
        
        if (videoTracks.length === 0) {
            logSocket('No video tracks in stream', 'warn');
            return;
        }
        
        // Log video track state
        videoTracks.forEach((track, index) => {
            logSocket(`Video track ${index}: readyState=${track.readyState}, enabled=${track.enabled}, muted=${track.muted}`, 'info');
        });
        
        // Ensure video is not muted
        remoteVideo.muted = false;
        
        // Try to play regardless of readyState
        // Some browsers don't properly set readyState but video still works
        logSocket(`Attempting to play video (readyState: ${remoteVideo.readyState})`, 'info');
        
        const playPromise = remoteVideo.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                logSocket('Remote video is playing!', 'success');
                logSocket(`Video dimensions: ${remoteVideo.videoWidth}x${remoteVideo.videoHeight}`, 'info');
            }).catch(error => {
                logSocket(`Failed to play remote video: ${error.message}`, 'error');
                // Don't give up - retry multiple times
                setTimeout(() => {
                    logSocket('Retrying play...', 'info');
                    remoteVideo.play().then(() => {
                        logSocket('Remote video playing on retry!', 'success');
                    }).catch(err => {
                        logSocket(`Retry play failed: ${err.message}`, 'error');
                        // One more retry
                        setTimeout(() => {
                            remoteVideo.play().catch(finalErr => {
                                logSocket(`Final retry failed: ${finalErr.message}`, 'error');
                            });
                        }, 1000);
                    });
                }, 500);
            });
        }
    }

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
        logSocket(`Connection state: ${peerConnection.connectionState}`, 'info');
        if (peerConnection.connectionState === 'connected') {
            logSocket('WebRTC connection established!', 'success');
        } else if (peerConnection.connectionState === 'failed') {
            logSocket('WebRTC connection failed', 'error');
        }
    };

    // Handle ICE connection state
    peerConnection.oniceconnectionstatechange = () => {
        logSocket(`ICE connection state: ${peerConnection.iceConnectionState}`, 'info');
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