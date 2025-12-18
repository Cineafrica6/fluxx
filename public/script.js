const API_URL = 'http://localhost:5000';
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
        alert('Registration successful! Check console for verification link.');
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
    const verifyToken = document.getElementById('verifyToken').value;

    await apiRequest(`/api/auth/verify-email/${verifyToken}`, 'GET');
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

    // Create peer connection
    peerConnection = new RTCPeerConnection(rtcConfig);

    // Add local stream
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    // Handle remote stream
    peerConnection.ontrack = (event) => {
        if (!remoteStream) {
            remoteStream = new MediaStream();
            document.getElementById('remoteVideo').srcObject = remoteStream;
        }
        remoteStream.addTrack(event.track);
        logSocket('Remote stream received', 'success');
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
        if (event.candidate && socket && currentRoomId) {
            socket.emit('ice_candidate', {
                candidate: event.candidate,
                roomId: currentRoomId
            });
        }
    };

    // If initiator, create offer
    if (isInitiator) {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        socket.emit('webrtc_offer', {
            offer: offer,
            roomId: currentRoomId
        });
        
        logSocket('WebRTC offer sent', 'info');
    }
}

async function handleOffer(offer) {
    if (!peerConnection) {
        await startWebRTC(false);
    }

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    
    socket.emit('webrtc_answer', {
        answer: answer,
        roomId: currentRoomId
    });
    
    logSocket('WebRTC answer sent', 'info');
}

async function handleAnswer(answer) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    logSocket('WebRTC connection established', 'success');
}

async function handleIceCandidate(candidate) {
    if (peerConnection) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
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