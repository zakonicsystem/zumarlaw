# Multi-Device Logout - Implementation Validation Checklist

## Pre-Deployment Verification

### Database Models ✅
- [x] `Session.js` exists with fields: userId, token, deviceInfo, isActive, createdAt, expiresAt, lastActivityAt
- [x] `AuthState.js` exists with field: globalLogoutAt
- [x] TTL index configured on Session for auto-cleanup

### Server Configuration ✅
- [x] `tokenService.js` exports: issueToken, verifyAppToken, forceLogoutAllDevices, assertTokenIsActive
- [x] Auth routes include: login, logout, logout-all, logout-device, sessions, verify-session, whoami
- [x] Sessions created on: login, signup, admin-register
- [x] Sessions invalidated on: logout, logout-all, reset-password

### Middleware Validation ✅
- [x] `verifyJWT` checks: JWT signature + session.isActive + global logout
- [x] `verifyJWT` updates: lastActivityAt on each request
- [x] `tryVerify` checks: JWT signature + session.isActive + global logout (non-blocking)
- [x] `tryVerify` updates: lastActivityAt if session found

### Client-Side Route Guards ✅
- [x] `AdminPrivateRoute` calls `/auth/whoami` with token
- [x] `AdminPrivateRoute` validates response for role in ['admin', 'employee']
- [x] `AdminPrivateRoute` clears tokens on 401
- [x] `AdminPrivateRoute` shows loading state while checking
- [x] `EmployeeProtectedRoute` calls `/auth/whoami` with token
- [x] `EmployeeProtectedRoute` validates role === 'employee'
- [x] `EmployeeProtectedRoute` validates location.pathname in assignedPages
- [x] `EmployeeProtectedRoute` clears tokens on 401

### API Configuration ✅
- [x] Axios interceptor automatically attaches `adminToken` > `token` > `employeeToken`
- [x] Response interceptor catches 401 and clears tokens
- [x] Response interceptor redirects to `/admin/login`

## Manual Testing Steps

### Test 1: Single Device Logout
**Expected**: User logged out, must re-login

```bash
# Terminal 1: Check initial session
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/auth/verify-user

# Response: 200 with user data ✅

# Terminal 2: Post logout
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/auth/logout

# Response: 200 with "Logged out from current device successfully"

# Terminal 1: Try using old token
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/auth/verify-user

# Response: 401 "Session expired or logged out" ✅
```

### Test 2: Logout All Devices

**Setup**: Login from 2 different browsers
```javascript
// Browser A: Login
localStorage.setItem('adminToken', 'token_a');
// Go to /admin - should work

// Browser B: Login
localStorage.setItem('adminToken', 'token_b');  
// Go to /admin - should work
```

**Action**: In Browser A, call logout-all
```javascript
fetch('http://localhost:5000/auth/logout-all', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
}).then(r => r.json()).then(console.log)

// Response: { message: "Logged out from all devices successfully", sessionsRemoved: 2 }
```

**Verification**: In Browser B
```javascript
// Check MongoDB
db.sessions.find({ isActive: true }).count() // Should show 0 for this user

// Try to navigate to /admin
// AdminPrivateRoute should call /auth/whoami
// whoami returns 401 (session inactive)
// Redirected to /admin/login ✅
```

### Test 3: Cross-Device Session Invalidation

**Setup**: 
```
Device A: Token = abc123 (session created in DB)
Device B: Token = def456 (session created in DB)
```

**Action**: Logout from all devices on Device A
```
POST /auth/logout-all
└─ Session.updateMany({ userId: '...', isActive: true }, { isActive: false })
└─ Both sessions now have isActive: false
```

**Verification on Device B**:
```
Device B tries to access /admin
→ AdminPrivateRoute runs
→ Calls GET /auth/whoami with token def456
→ tryVerify middleware:
    ├─ jwt.verify(token) ✅ (signature still valid)
    ├─ Session.findOne({ token: 'def456', isActive: true }) 
    │   └─ Returns NULL (isActive is false)
    └─ Does not set req.user
→ /whoami returns 401
→ API interceptor catches 401
→ Clears tokens and redirects to /admin/login ✅
```

### Test 4: View Active Sessions

```javascript
const token = localStorage.getItem('adminToken');

fetch('http://localhost:5000/auth/sessions', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(data => console.log(JSON.stringify(data, null, 2)))

// Expected response:
{
  "message": "Active sessions retrieved",
  "totalSessions": 2,
  "sessions": [
    {
      "sessionId": "507f1f77bcf86cd799439011",
      "deviceInfo": {
        "userAgent": "Mozilla/5.0...",
        "ipAddress": "192.168.1.1",
        "deviceName": "Unknown Device"
      },
      "createdAt": "2024-04-07T10:30:00Z",
      "lastActivityAt": "2024-04-07T12:45:00Z",
      "expiresAt": "2024-04-08T10:30:00Z"
    },
    {
      // ... more sessions
    }
  ]
}
```

### Test 5: Password Change Invalidates All Sessions

**Setup**: 2 active sessions

```javascript
// Reset password
fetch('http://localhost:5000/auth/reset-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    email: 'user@example.com',
    newPassword: 'newpassword123'
  })
})
.then(r => r.json())
// Response: "Password reset successful"

// Check DB - all sessions should have isActive: false
db.sessions.find({ userId: '...', isActive: true }).count() // Should be 0
```

### Test 6: Global Admin Logout (All Users)

**Setup**: 5 different users logged in

```javascript
// Admin user calls
const token = localStorage.getItem('adminToken');

fetch('http://localhost:5000/auth/logout-all-devices-now', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
// Response: "All logged-in devices have been logged out"

// All 5 users' existing tokens are now invalid
// They'll get TokenRevokedError when trying to access protected routes
```

### Test 7: Browser Refresh Behavior

**Scenario**: User logged in, logs out from different device, refreshes browser

**Expected Behavior**:
```
1. User A is logged in on Chrome (token stored in localStorage)
2. User A logs out from Safari using /logout-all
3. User A refreshes Chrome browser
4. AdminPrivateRoute component mounts
5. useEffect runs verifyAccess() function
6. Calls GET /auth/whoami with stored token
7. tryVerify checks: JWT valid ✓, but session.isActive = false ✗
8. Does not set req.user
9. /whoami returns 401
10. AdminPrivateRoute catches error
11. Clears tokens from localStorage
12. Redirects to /admin/login ✅
13. User sees login form
```

## MongoDB Validation Queries

```javascript
// Check sessions created for a user
db.sessions.find({ userId: ObjectId('...') })

// Check if any sessions are still active
db.sessions.find({ isActive: true }).count()

// Check when global logout was triggered
db.authstates.findOne()
// { globalLogoutAt: ISODate("2024-04-07T12:00:00Z") }

// Verify TTL index exists
db.sessions.getIndexes()
// Should show: { "key": { "expiresAt": 1 }, "expireAfterSeconds": 0 }
```

## Common Issues & Solutions

### Issue: Session not created on login
**Check**:
- [ ] `issueToken` is being called in generateToken()
- [ ] `createSession` is being called after token generation
- [ ] MongoDB connected and Session model imported

**Fix**: Restart server and check logs for errors

### Issue: Old device still shows dashboard after logout-all
**Check**:
- [ ] AdminPrivateRoute is checking session on route enter
- [ ] tryVerify is checking Session.find({ token, isActive: true })
- [ ] API interceptor is clearing tokens on 401

**Test**: Check browser console for API errors, verify tokens cleared

### Issue: User redirected to login but token still valid
**Check**:
- [ ] Session record exists in DB with isActive: true
- [ ] No global logout triggered (check AuthState)
- [ ] JWT signature is valid

**Debug**: Log what tryVerify finds in Session.find() call

### Issue: logout-all not logging out all sessions
**Check**:
- [ ] Query is: `Session.updateMany({ userId, isActive: true }, ...)`
- [ ] userId is correctly extracted from req.user.id
- [ ] All sessions have same userId

**Verify**: 
```javascript
db.sessions.updateMany(
  { userId: ObjectId('...'), isActive: true },
  { $set: { isActive: false } }
)
```

## Performance Considerations

- **Session database queries**: One per request in middleware
- **Index**: Create index on `{ userId: 1, isActive: 1 }` for faster queries
- **TTL cleanup**: Automatic via MongoDB, no maintenance needed
- **Activity tracking**: Minimal impact (one save per request)

**Suggested MongoDB indexes**:
```javascript
db.sessions.createIndex({ userId: 1, isActive: 1 })
db.sessions.createIndex({ token: 1 }, { unique: true })
db.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
db.authstates.createIndex({ globalLogoutAt: 1 })
```

## Success Criteria

✅ **All criteria met** = Implementation working correctly:
- [ ] Single device logout works (session inactive)
- [ ] Logout all devices works (all sessions inactive)
- [ ] Old devices detect invalidation at route guard
- [ ] Password reset invalidates all sessions
- [ ] Admin can force global logout
- [ ] Session activity tracked correctly
- [ ] No errors in browser console
- [ ] No errors in server logs
- [ ] Database shows proper session state
