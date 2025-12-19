   # Fluxx - User Flow Documentation

   ## Overview
   Fluxx is a university-exclusive random video chat platform. This document outlines the complete user journey and flow from registration to video chatting.

   ---

   ## 1. Authentication Flow

   ### 1.1 Registration
   **Entry Point:** Landing page or registration screen

   **Steps:**
   1. User sees registration form
   2. User enters:
      - Email address (any email for testing, .edu in production)
      - Password (minimum 6 characters)
   3. User clicks "Register" button
   4. **Backend:** Creates user account, generates 6-digit OTP
   5. **UI State:** 
      - Show loading state
      - Display OTP prominently on screen (large, easy to read)
      - Show message: "Registration successful! Enter the OTP below to verify your email"
      - Auto-fill email in verification form
      - Auto-fill OTP in verification input
   6. User can:
      - Copy OTP manually
      - Click "Resend OTP" if needed
      - Proceed to verification

   **UI Elements:**
   - Registration form (email, password)
   - OTP display box (large, styled, visible)
   - "Resend OTP" button
   - Link to login page

   ---

   ### 1.2 Email Verification
   **Entry Point:** After registration or from email link

   **Steps:**
   1. User sees verification form
   2. User enters:
      - Email (auto-filled from registration)
      - 6-digit OTP (auto-filled from registration)
   3. User clicks "Verify" button
   4. **Backend:** Validates OTP, marks email as verified
   5. **UI State:**
      - Show success message: "Email verified successfully!"
      - Hide OTP display
      - Redirect to main app or show "Continue" button
   6. If OTP is invalid/expired:
      - Show error message
      - Allow user to request new OTP

   **UI Elements:**
   - Verification form (email, OTP input)
   - "Verify" button
   - "Resend OTP" button
   - Error messages
   - Success message

   ---

   ### 1.3 Login
   **Entry Point:** Login page or from registration success

   **Steps:**
   1. User sees login form
   2. User enters:
      - Email address
      - Password
   3. User clicks "Login" button
   4. **Backend:** Validates credentials, checks if banned, returns JWT token
   5. **UI State:**
      - Show loading state
      - On success: Store token, redirect to main app
      - On failure: Show error message
   6. If user is banned:
      - Show ban message with expiry date and reason
      - Prevent login

   **UI Elements:**
   - Login form (email, password)
   - "Login" button
   - "Forgot Password?" link (future feature)
   - Link to registration page
   - Error messages

   ---

   ## 2. Main Application Flow

### 2.1 App Entry (After Login)
**Entry Point:** After successful login/verification

**Initial State:**
- User is authenticated
- Token stored in localStorage
- User profile loaded
- **Socket connection automatically established** (no manual connect button)
- User is ready to start chatting

**UI Shows:**
- Main video chat interface
- User's display name/avatar
- "Start Video" or "Start Chat" button (primary action)
- Settings/Profile menu
- Logout option

**Note:** WebSocket connection happens automatically in the background - users never see a "Connect Socket" button

   ---

   ### 2.2 Matchmaking Flow

#### 2.2.1 Starting Video Chat (Automatic Pairing)
**Steps:**
1. User clicks "Start Video" button
2. **Backend:** 
   - Validates user (not banned, verified)
   - Automatically adds user to matchmaking queue
3. **UI State:**
   - Show loading state
   - Button changes to "Looking for someone..."
   - Show status: "Searching for a match..."
   - Disable "Start Video" button
   - Show "Cancel" button (to leave queue)
   - Request camera/microphone permissions (if not already granted)
4. **Backend:** When 2+ users in queue, matches them randomly
5. **UI State:** 
   - Show "Match found!" animation/message
   - Automatically start local video feed
   - Transition to video chat screen
   - Initialize WebRTC connection automatically
   - Show both local and remote video feeds

**UI Elements:**
- "Start Video" button (primary, large, prominent)
- Queue status: "Searching for someone to chat with..."
- "Cancel" button (to leave queue)
- Loading spinner/animation
- Permission request overlay (if needed)

   ---

   #### 2.2.2 Match Found
   **Steps:**
   1. **Backend:** Sends match_found event via Socket.IO
   2. **UI State:**
      - Show "Match found!" notification
      - Transition to video chat view
      - Initialize WebRTC connection
      - Show both local and remote video feeds
      - Enable video chat controls

   **UI Elements:**
   - Video chat container
   - Local video feed (small, corner)
   - Remote video feed (large, center)
   - Video controls (mute, video on/off, etc.)
   - "Next" button
   - "End Chat" button

   ---

   ### 2.3 Video Chat Flow

#### 2.3.1 Video Chat Active State
**UI Layout:**
```
┌─────────────────────────────────┐
│  [Local Video] (small, corner)  │
│                                 │
│    [Remote Video] (large)       │
│                                 │
│  [Controls: Mute | Video | ...] │
│  [Next] [End Chat]              │
└─────────────────────────────────┘
```

**User Actions Available:**
1. **Toggle Microphone:**
   - Click mute/unmute button
   - Icon changes (mic on/off)
   - Local video shows mute indicator
   - **Automatic:** Changes apply immediately, no reconnection needed

2. **Toggle Video:**
   - Click video on/off button
   - Camera stops/starts
   - Remote peer sees black screen or "Video paused" message
   - **Automatic:** Changes apply immediately via track replacement

3. **Next Match (Primary Action):**
   - Click "Next" button (prominent, easy to access)
   - Current chat ends smoothly
   - **Automatically rejoins queue** (no manual action needed)
   - Shows "Looking for next match..."
   - Local video continues
   - When new match found, automatically connects

4. **End Chat:**
   - Click "End Chat" button (secondary action)
   - Chat ends completely
   - Returns to main screen
   - User must click "Start Video" again to find new match

5. **Report User:**
   - Click "Report" button (usually in menu or overlay)
   - Opens report modal
   - Select reason (inappropriate content, harassment, etc.)
   - Add optional details
   - Submit report
   - Chat may end if user gets banned
   - Option to find next match after reporting

**UI Elements:**
- Local video feed (preview, corner)
- Remote video feed (main, center)
- Mute/unmute button (prominent)
- Video on/off button (prominent)
- **"Next" button** (large, prominent, primary action)
- "End Chat" button (secondary, smaller)
- "Report" button (in menu/overlay)
- Connection status indicator

**Key UX Principles:**
- **"Next" is the primary action** - users will use this most often
- **Everything is automatic** - no manual WebSocket connection, automatic reconnection, automatic queue rejoining
- **Smooth transitions** - no jarring stops, smooth flow between matches

   ---

   #### 2.3.2 Video Controls States

   **Microphone States:**
   - **Unmuted:** Mic icon, audio transmitting
   - **Muted:** Mic with slash icon, audio not transmitting
   - **Visual Feedback:** Indicator on local video

   **Video States:**
   - **On:** Camera icon, video transmitting
   - **Off:** Camera with slash icon, video not transmitting
   - **Visual Feedback:** 
   - Local: Shows "Video paused" or black screen
   - Remote: Shows "Partner's video is paused" message

   ---

   #### 2.3.3 Connection States
   **UI Indicators:**
   - **Connecting:** Spinner, "Connecting..." message
   - **Connected:** Green indicator, "Connected"
   - **Disconnected:** Red indicator, "Connection lost"
   - **Reconnecting:** Spinner, "Reconnecting..."

   ---

   ### 2.4 Chat End Scenarios

#### 2.4.1 User Clicks "Next" (Primary Action)
**Flow:**
1. User clicks "Next" button
2. **Backend:** 
   - Ends current match
   - Automatically removes user from current match
   - Automatically adds user back to queue
3. **UI State:**
   - Smooth transition animation
   - Show "Looking for next match..." message
   - **Automatically keeps user in queue** (no manual action)
   - Local video continues (user can still see themselves)
   - Remote video fades out
   - Show queue status: "Searching..."
4. **Backend:** When new match found (automatically)
5. **UI State:**
   - Show "Match found!" animation
   - Automatically connect to new partner
   - Remote video fades in
   - Continue chatting seamlessly

**Key Points:**
- **Fully automatic** - user clicks "Next" and everything happens automatically
- **No manual queue rejoining** - happens in background
- **Smooth experience** - feels like continuous flow
- **Local video persists** - user always sees themselves

   ---

   #### 2.4.2 User Clicks "End Chat"
   **Flow:**
   1. User clicks "End Chat" button
   2. **Backend:** Ends match, removes from queue
   3. **UI State:**
      - Return to main screen
      - Show "Chat ended" message
      - Stop local video (optional)
      - Show "Start Chat" button again

   ---

#### 2.4.3 Partner Disconnects
**Flow:**
1. Partner leaves, disconnects, or clicks "Next"
2. **Backend:** Detects disconnect, ends match
3. **UI State:**
   - Show "Partner left" or "Partner disconnected" message
   - Remote video stops/fades out
   - **Automatically rejoin queue** (default behavior)
   - Show "Looking for next match..." automatically
   - Local video continues
4. When new match found, automatically connect (same as "Next" flow)

**Key Points:**
- **Automatic recovery** - no manual action needed
- **Seamless experience** - user doesn't have to click anything
- **Option to cancel** - user can still click "End Chat" if they want to stop completely

   ---

   #### 2.4.4 User Gets Banned During Chat
   **Flow:**
   1. User receives multiple reports
   2. **Backend:** Auto-bans user (3 reports/24h or 5 total)
   3. **UI State:**
      - Show ban notification: "You have been banned"
      - Show ban reason and expiry
      - End current chat
      - Logout user
      - Redirect to login with ban message

   ---

   ## 3. Reporting Flow

   ### 3.1 Report User
   **Entry Point:** During active video chat

   **Steps:**
   1. User clicks "Report" button (usually in menu or overlay)
   2. **UI State:** Show report modal
   3. User selects reason:
      - Inappropriate content
      - Harassment
      - Nudity
      - Spam
      - Other
   4. User optionally adds details (text area)
   5. User clicks "Submit Report"
   6. **Backend:** Creates report, checks ban conditions
   7. **UI State:**
      - Show "Report submitted" confirmation
      - If user gets banned: Show ban notification
      - End current chat
      - Option to find new match

   **UI Elements:**
   - Report modal/overlay
   - Reason selection (radio buttons or dropdown)
   - Details text area (optional)
   - "Submit" button
   - "Cancel" button

   ---

   ## 4. Profile/Settings Flow

   ### 4.1 User Profile
   **Entry Point:** Profile menu or settings icon

   **UI Shows:**
   - Display name (auto-generated, e.g., "Fluxx_1234")
   - Email address
   - Account status (Verified/Unverified)
   - Report stats (if any)
   - Account creation date

   **Actions:**
   - View profile (read-only for now)
   - Logout
   - Delete account (future feature)

   ---

   ### 4.2 Settings
   **Entry Point:** Settings menu

   **Settings Available:**
   - **Video Settings:**
   - Camera selection
   - Microphone selection
   - Video quality
   - **Privacy Settings:**
   - Who can see your profile (future)
   - **Notifications:** (future)
   - **Account:**
   - Change password (future)
   - Delete account (future)

   ---

   ## 5. Error States & Edge Cases

   ### 5.1 Network Errors
   **Scenarios:**
   - **No Internet:** Show "No internet connection" message
   - **Connection Lost:** Show "Reconnecting..." with retry option
   - **Server Error:** Show error message, allow retry

   ### 5.2 Permission Errors
   **Scenarios:**
   - **Camera Denied:** Show "Camera permission required" with instructions
   - **Microphone Denied:** Show "Microphone permission required" with instructions
   - **Both Denied:** Show combined message with settings link

   ### 5.3 WebRTC Errors
   **Scenarios:**
   - **Connection Failed:** Show "Could not connect" with retry option
   - **Video Not Loading:** Show troubleshooting tips
   - **Audio Issues:** Show audio troubleshooting

   ### 5.4 User State Errors
   **Scenarios:**
   - **Not Verified:** Show "Please verify your email" message
   - **Banned:** Show ban message with expiry
   - **Token Expired:** Auto-logout, redirect to login

   ---

   ## 6. UI States Summary

   ### 6.1 Authentication States
   - **Logged Out:** Login/Register screens
   - **Logged In:** Main app interface
   - **Verifying:** OTP verification screen

   ### 6.2 Matchmaking States
   - **Idle:** "Start Chat" button visible
   - **In Queue:** "Looking for match..." with "Leave Queue" button
   - **Match Found:** Transitioning to video chat
   - **In Chat:** Video chat active

   ### 6.3 Video Chat States
   - **Connecting:** Establishing WebRTC connection
   - **Connected:** Video/audio active
   - **Disconnected:** Connection lost, showing reconnection
   - **Ended:** Chat finished, options to find new match

   ---

## 7. Key User Interactions

### 7.1 Primary Actions (Most Common)
1. **Start Video** → Automatically join queue → Match found → Video chat starts
2. **Next** → End current match → **Automatically rejoin queue** → New match found → Continue
3. **Toggle Audio/Video** → Immediate feedback, no reconnection needed

### 7.2 Secondary Actions (Less Common)
1. **End Chat** → Exit completely → Return to main screen
2. **Report User** → Submit report → Option to continue or end
3. **Cancel** (while in queue) → Leave queue → Return to idle state

### 7.3 Automatic Behaviors (No User Action Required)
1. **WebSocket Connection** → Automatically connects on app load
2. **Queue Rejoining** → Automatically happens when clicking "Next"
3. **Match Connection** → Automatically connects when match found
4. **Reconnection** → Automatically reconnects if connection lost
5. **Permission Requests** → Automatically requested when starting video

   ---

   ## 8. Mobile Considerations

   ### 8.1 Touch Interactions
   - Large touch targets (minimum 44x44px)
   - Swipe gestures for navigation (optional)
   - Bottom navigation for mobile
   - Full-screen video on mobile

   ### 8.2 Mobile-Specific UI
   - Video takes full screen
   - Controls overlay on video
   - Simplified menu for mobile
   - Portrait/landscape handling

   ---

   ## 9. Accessibility Considerations

   ### 9.1 Visual
   - High contrast mode support
   - Text size adjustments
   - Color-blind friendly indicators

   ### 9.2 Audio
   - Visual indicators for all audio states
   - Captions/subtitles (future)
   - Screen reader support

   ### 9.3 Keyboard Navigation
   - Tab navigation through all interactive elements
   - Keyboard shortcuts for common actions
   - Focus indicators

   ---

   ## 10. Data Flow Summary

   ### 10.1 Authentication Data
   ```
   User Input → Validation → Backend API → JWT Token → LocalStorage → Socket Auth
   ```

   ### 10.2 Matchmaking Data
   ```
   Join Queue → Socket Event → Backend Queue → Match Found → Socket Event → WebRTC Init
   ```

   ### 10.3 Video Chat Data
   ```
   WebRTC Offer/Answer → Socket Signaling → Peer Connection → Media Streams (P2P)
   ```

   ### 10.4 Reporting Data
   ```
   Report Form → Backend API → Moderation Service → Auto-ban Check → Socket Notification
   ```

   ---

   ## 11. Screen Flow Diagram

```
[Landing/Login]
    ↓
[Registration] → [OTP Verification] → [Main App] (Socket Auto-Connected)
    ↓                                    ↓
[Login] ───────────────────────────→ [Main App] (Socket Auto-Connected)
                                        ↓
                              [Click "Start Video"]
                                        ↓
                        [Auto-Join Queue / Searching...]
                                        ↓
                              [Match Found! Auto-Connect]
                                        ↓
                              [Video Chat Active]
                                        ↓
                    ┌───────────────────┴───────────────────┐
                    ↓                                       ↓
        [Click "Next"] (Primary)              [Click "End Chat"]
                    ↓                                       ↓
        [Auto-End Match]                      [Exit Completely]
                    ↓                                       ↓
        [Auto-Rejoin Queue]                          [Main App]
                    ↓
        [Auto-Searching...]
                    ↓
        [New Match Found! Auto-Connect]
                    ↓
        [Video Chat Active] (Loop continues)
```

**Key Flow Points:**
- Socket connection is **automatic** (happens on app load)
- Queue joining is **automatic** (happens when clicking "Start Video")
- Queue rejoining is **automatic** (happens when clicking "Next")
- WebRTC connection is **automatic** (happens when match found)
- User only needs to click: "Start Video" → "Next" → "Next" → etc.

   ---

   ## 12. Key UI Components Needed

   ### 12.1 Authentication
   - Login form
   - Registration form
   - OTP verification form
   - OTP display component
   - Error message component

   ### 12.2 Main App
   - Header/Navigation
   - User profile menu
   - Settings menu
   - Queue status indicator

   ### 12.3 Video Chat
   - Video container component
   - Local video preview
   - Remote video display
   - Control buttons (mute, video, next, end)
   - Connection status indicator
   - Report modal

   ### 12.4 Common
   - Loading spinner
   - Error toast/notification
   - Success message
   - Modal/Overlay component
   - Button components
   - Input components

   ---

## 13. State Management Considerations

### 13.1 Global State Needed
- **Auth State:**
  - isAuthenticated
  - user (profile data)
  - token
  - isVerified

- **Socket State:**
  - isSocketConnected (automatic, user never sees this)
  - socketInstance

- **Matchmaking State:**
  - inQueue (automatic when user clicks "Start Video")
  - queuePosition
  - isMatched
  - currentMatch (roomId, partnerId)
  - autoRejoinEnabled (true by default)

- **Video Chat State:**
  - isConnected
  - localStream
  - remoteStream
  - isMuted
  - isVideoOn
  - connectionStatus
  - isConnecting

- **UI State:**
  - currentScreen
  - isLoading
  - errorMessage
  - showReportModal
  - queueStatus ("idle" | "searching" | "matched" | "connecting")

### 13.2 Automatic State Transitions
- **App Load** → Auto-connect socket → Ready state
- **Start Video** → Auto-join queue → Searching state
- **Match Found** → Auto-connect WebRTC → Chatting state
- **Click Next** → Auto-end match → Auto-rejoin queue → Searching state → Match Found → Chatting state
- **Partner Leaves** → Auto-rejoin queue → Searching state → Match Found → Chatting state

   ---

   ## 14. Next Steps for Frontend Implementation

   1. **Set up project structure** (React/Vue/Next.js/etc.)
   2. **Create authentication screens** (Login, Register, Verify)
   3. **Build main app layout** (Header, Navigation, Content area)
   4. **Implement matchmaking UI** (Queue status, Match found animation)
   5. **Build video chat component** (Video feeds, Controls)
   6. **Add WebRTC integration** (Connection, Media streams)
   7. **Implement reporting flow** (Modal, Form submission)
   8. **Add error handling** (Network errors, Permission errors)
   9. **Mobile optimization** (Responsive design, Touch interactions)
   10. **Testing** (User flows, Edge cases)

   ---

   ## Notes

   - All backend API calls should be abstracted into service functions
   - WebRTC should be abstracted into a separate service/class
   - Socket.IO events should be handled through a centralized event handler
   - State management should use a library (Redux, Zustand, Context API, etc.)
   - All user-facing text should be in a localization file (for future i18n)
   - Error messages should be user-friendly, not technical

