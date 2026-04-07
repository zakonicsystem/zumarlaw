# Multi-Device Logout Functionality - Implementation Guide

## Overview
This implementation adds the ability to logout from all devices for a user in the Zumar Law Firm application. When a user logs out, either from a single device or all devices, their session becomes inactive and they will need to log in again.

## Features Implemented

### 1. **Session Tracking Model** (`Session.js`)
- Tracks all active sessions per user
- Stores device information (user agent, IP address, device name)
- Auto-expires sessions based on JWT expiration time
- Tracks last activity timestamp

### 2. **Authentication Updates**

#### Login Endpoints (Updated)
- **POST `/auth/login`** - Creates a new session on login
- **POST `/auth/signup`** - Creates a new session on signup  
- **POST `/auth/admin-register`** - Creates a new session for admin registration

Each login now:
1. Generates a JWT token
2. Creates a session record in the database
3. Stores device information automatically

#### New Logout Endpoints

- **POST `/auth/logout`** - Logout from current device only
  - Requires: Valid JWT token in Authorization header
  - Response: Current device info
  
- **POST `/auth/logout-all`** - Logout from ALL devices
  - Requires: Valid JWT token in Authorization header
  - Response: Number of sessions removed
  
- **GET `/auth/sessions`** - View all active sessions
  - Requires: Valid JWT token in Authorization header
  - Response: List of all active sessions with device info, login time, expiration time
  
- **POST `/auth/logout-device/:sessionId`** - Logout from specific device
  - Requires: Valid JWT token in Authorization header
  - Route param: Session ID
  - Response: Device info of logged out device

### 3. **Middleware Updates** (`authMiddleware.js`)
- `verifyJWT` middleware now validates that:
  1. Token signature is valid
  2. Session exists and is marked as active
  3. Session hasn't expired
  4. Updates last activity timestamp on each request

### 4. **Password Reset Update**
- **POST `/auth/reset-password`** - Now invalidates all sessions when password is changed
  - Security best practice: Forces re-login on all devices when password changes

## Database Schema

### Session Model
```javascript
{
  userId: ObjectId (references User),
  token: String (JWT token, unique),
  deviceInfo: {
    userAgent: String,
    ipAddress: String,
    deviceName: String
  },
  isActive: Boolean,
  createdAt: Date,
  expiresAt: Date,
  lastActivityAt: Date,
  updatedAt: Date
}
```

## Frontend Implementation Guide

### 1. Login Flow
```javascript
// After login, store the token
const response = await fetch('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
const data = await response.json();
localStorage.setItem('token', data.token);
```

### 2. Logout from Current Device
```javascript
const logout = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch('/auth/logout', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await response.json();
  localStorage.removeItem('token');
  // Redirect to login
};
```

### 3. Logout from All Devices
```javascript
const logoutAllDevices = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch('/auth/logout-all', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await response.json();
  console.log(`Logged out from ${data.sessionsRemoved} devices`);
  localStorage.removeItem('token');
  // Redirect to login
};
```

### 4. View Active Sessions
```javascript
const viewActiveSessions = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch('/auth/sessions', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await response.json();
  console.log('Active sessions:', data.sessions);
  // Display sessions to user with logout options
};
```

### 5. Logout from Specific Device
```javascript
const logoutSpecificDevice = async (sessionId) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`/auth/logout-device/${sessionId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await response.json();
  console.log('Logged out from:', data.deviceInfo);
  // Refresh sessions list
};
```

## API Response Examples

### Login Success
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com"
  }
}
```

### Logout Success
```json
{
  "message": "Logged out from current device successfully",
  "deviceInfo": {
    "userAgent": "Mozilla/5.0...",
    "ipAddress": "192.168.1.1",
    "deviceName": "Chrome on Windows"
  }
}
```

### View Sessions Success
```json
{
  "message": "Active sessions retrieved",
  "totalSessions": 3,
  "sessions": [
    {
      "sessionId": "507f1f77bcf86cd799439011",
      "deviceInfo": {
        "userAgent": "Mozilla/5.0...",
        "ipAddress": "192.168.1.1",
        "deviceName": "Chrome on Windows"
      },
      "createdAt": "2024-04-07T10:30:00Z",
      "lastActivityAt": "2024-04-07T12:45:00Z",
      "expiresAt": "2024-04-08T10:30:00Z"
    }
  ]
}
```

## Error Responses

### Session Expired/Logged Out
```json
{
  "message": "Session expired or logged out. Please login again."
}
Status: 401
```

### No Active Session
```json
{
  "message": "Session not found or already logged out"
}
Status: 401
```

## Security Features

1. **Session Validation**: Every request checks if the session is still active
2. **Token in Database**: JWT tokens are stored in the database for revocation
3. **Activity Tracking**: Last activity time is updated on each request
4. **Automatic Expiration**: Sessions auto-delete when JWT expires
5. **Device Tracking**: IP address and user agent stored for security
6. **Password Change Logout**: Changing password logs out all devices

## Testing

### Manual Testing Steps

1. **Test Login Creates Session**
   - Login from browser
   - Check MongoDB: `db.sessions.find()` should show new record

2. **Test Logout from Current Device**
   - Login from 2 browsers
   - Logout from first browser
   - API should return device info
   - Session should be marked as inactive

3. **Test Logout All Devices**
   - Login from multiple browsers
   - Call `/auth/logout-all` from one
   - Verify all sessions are inactive
   - Other browsers should be forced to login

4. **Test View Sessions**
   - Login from multiple devices
   - Call `/auth/sessions`
   - Should show all active sessions with device info

## Files Modified/Created

- ✅ **Created**: `server/models/Session.js` - New session tracking model
- ✅ **Updated**: `server/routes/auth.js` - Added logout endpoints and session creation
- ✅ **Updated**: `server/middleware/authMiddleware.js` - Added session validation
- ✅ **Updated**: `server/routes/auth.js` - Updated password reset to invalidate sessions

## Future Enhancements

1. **Device Management UI**: Allow users to see and manage all their active sessions
2. **Security Alerts**: Notify user when logging in from new device
3. **Session Timeout**: Auto-logout after inactivity
4. **Biometric Login**: Option to skip login on trusted devices
5. **Location-based Logout**: Logout from unusual locations
6. **Session Limits**: Limit max concurrent sessions per user
