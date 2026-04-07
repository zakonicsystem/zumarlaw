# New Logout Feature: New Credentials Also Affected

## Overview
When a user logs out from all devices, **any new login by that user is also immediately invalidated**. This prevents:
- Session hijacking with old leaked credentials
- Unauthorized access if login credentials are compromised
- Accidental re-login with stale tokens

## How It Works

### Before: Only Current Sessions Removed
```
User logs out from all devices
├─ Session.updateMany({ userId, isActive: false })
└─ All active sessions marked inactive ✓
   But: User can immediately log back in ✓
```

### After: New Logins Also Blocked Until Server-Side Clear
```
User logs out from all devices
├─ Session.updateMany({ userId, isActive: false })
├─ User.lastLogoutAt = NOW ✅ (NEW)
└─ Any token issued BEFORE this timestamp is invalid
    
User tries to log back in
├─ New token issued at T+1 second
├─ Token.iat = T+1 second
├─ Server checks: token.iat < user.lastLogoutAt?
│   └─ T+1 > T? NO ✅ Token is valid, accept login
└─ User can now log in successfully
```

## Token Validation Flow

### When Any Token is Verified:
```
verifyAppToken(token)
  ├─ 1. jwt.verify() → Check signature
  ├─ 2. assertTokenIsActive() → Check global logout
  └─ 3. assertUserTokenValid() → CHECK user.lastLogoutAt ✅ (NEW)
        ├─ Load user from database
        ├─ Get user.lastLogoutAt timestamp
        ├─ Compare: token.iat < user.lastLogoutAt?
        │   ├─ YES → Throw TokenRevokedError ❌
        │   └─ NO → Token is valid ✓
        └─ Load employee from database (if user not found)
            └─ Same check for employee.lastLogoutAt
```

## Database Schema Changes

### User Model
```javascript
{
  // ... existing fields ...
  lastLogoutAt: {
    type: Date,
    default: null
  }
}
```

### Roles Model (Employees)
```javascript
{
  // ... existing fields ...
  lastLogoutAt: {
    type: Date,
    default: null
  }
}
```

## API Endpoints

### Logout from All Devices (Updated)
**POST `/auth/logout-all`**
```javascript
// Request
Authorization: Bearer {token}

// Response
{
  "message": "Logged out from all devices successfully. New login required.",
  "sessionsRemoved": 3,
  "logoutAt": "2024-04-07T12:30:00Z"
}
```

**What Happens**:
1. ✅ Marks all sessions as `isActive: false`
2. ✅ Sets `user.lastLogoutAt = NOW` (NEW)
3. Any token issued BEFORE this moment is now invalid

### Reset Password (Updated)
**POST `/auth/reset-password`**
```javascript
// Response
{
  "message": "Password reset successful. Please login again with your new password."
}
```

**What Happens**:
1. ✅ Changes password hash
2. ✅ Sets `user.lastLogoutAt = NOW` (forces re-login)
3. ❌ Invalidates all previous tokens

### New: Reactivate User (Admin Only)
**POST `/auth/admin/reactivate-user/:userId`**
```javascript
// Request
Authorization: Bearer {adminToken}

// Response
{
  "message": "User reactivated. They can now log in again.",
  "userId": "607f1f77bcf86cd799439011"
}
```

**What Happens**:
1. Admin manually clears the user's `lastLogoutAt`
2. User can log in again
3. (Useful if user was incorrectly locked out)

## Timeline Example

### Scenario: User logs out, then tries to log back in
```
12:00:00 - User logs in 
         └─ Token A issued (iat = 12:00:00)

12:30:00 - User clicks "Logout from All Devices"
         └─ User.lastLogoutAt = 12:30:00 ✅

12:30:05 - User logs back in with same credentials
         └─ Token B issued (iat = 12:30:05)

12:30:10 - User tries to access /admin with Token B
         └─ Server verification:
            ├─ Token B.iat = 12:30:05
            ├─ User.lastLogoutAt = 12:30:00
            ├─ Is 12:30:05 < 12:30:00? NO ✓
            └─ Token B is VALID ✅ (new login accepted)

12:30:15 - User tries old Token A (from 12:00:00)
         └─ Server verification:
            ├─ Token A.iat = 12:00:00
            ├─ User.lastLogoutAt = 12:30:00
            ├─ Is 12:00:00 < 12:30:00? YES ✗
            └─ Token A is INVALID ❌ (rejected)
```

## Security Benefits

| Scenario | Before | After |
|----------|--------|-------|
| User logs out, attacker has old token | Attacker blocked (session inactive) | Attacker blocked (token timestamp before logout) |
| User resets password, old session active | User must wait for token expiry | Immediate rejection via lastLogoutAt |
| User logs out and immediately re-logs in | New session works | New session works (new token issued after logout) |
| Compromised device logs in again | New session can be created | Depends on whether device blocks UI or forces re-check |

## Error Messages

### Token Invalidated by User Logout
```json
Status: 401
{
  "message": "Session expired or logged out. Please login again.",
  "error": "Token invalidated by user logout"
}
```

### Token Invalidated by Global Logout
```json
Status: 401
{
  "message": "Session invalidated. Please login again.",
  "error": "Token invalidated by global logout"
}
```

## Testing Scenarios

### Test 1: Logout All, Then Re-login
```bash
# Step 1: User A logs in
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"pass"}'
# Response: { token: "token_abc", ...}

# Step 2: User A logs out from all devices
curl -X POST http://localhost:5000/auth/logout-all \
  -H "Authorization: Bearer token_abc"
# Response: { message: "Logged out...", logoutAt: "2024-04-07T12:30:00Z" }

# Step 3: User A logs back in
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"pass"}'
# Response: { token: "token_def", ... } ✅ New token issued

# Step 4: Try old token
curl -H "Authorization: Bearer token_abc" \
  http://localhost:5000/auth/verify-user
# Response: 401 "Token invalidated by user logout" ❌ Old token rejected

# Step 5: Try new token
curl -H "Authorization: Bearer token_def" \
  http://localhost:5000/auth/verify-user
# Response: 200 { user: {...} } ✅ New token accepted
```

### Test 2: Reset Password
```bash
# Step 1: Reset password
curl -X POST http://localhost:5000/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","newPassword":"newpass"}'
# user.lastLogoutAt is set

# Step 2: Old token no longer works
curl -H "Authorization: Bearer token_old" \
  http://localhost:5000/auth/verify-user
# Response: 401 "Token invalidated" ❌

# Step 3: Login with new password
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"newpass"}'
# Response: { token: "token_new", ... } ✅
```

### Test 3: Admin Reactivates User
```bash
# Step 1: User accidentally locked out (admin needs to verify)
# Admin calls:
curl -X POST http://localhost:5000/auth/admin/reactivate-user/607f1f77bcf86cd799439011 \
  -H "Authorization: Bearer {adminToken}"
# Response: { message: "User reactivated...", userId: "..." } ✅

# Step 2: User can log in again
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"pass"}'
# Response: { token: "token_new", ... } ✅
```

## Implementation Details

### Files Modified
1. **User.js** - Added `lastLogoutAt: Date` field
2. **Roles.js** - Added `lastLogoutAt: Date` field  
3. **tokenService.js** - Added `assertUserTokenValid()` function
4. **auth.js** - Updated `/logout-all` and `/reset-password` to set `lastLogoutAt`
5. **auth.js** - Added `/admin/reactivate-user/:userId` endpoint

### Backward Compatibility
✅ **Fully compatible** - Existing tokens continue to work for 24 hours (default expiry)
✅ **No migration needed** - `lastLogoutAt` defaults to `null`
✅ **Gradual enforcement** - Only affects new logout/logout-all operations

## Configuration

### Token Expiry (Default: 24 hours)
In `tokenService.js`:
```javascript
const DEFAULT_TOKEN_EXPIRY = '1d';
```

To change, update the value (e.g., `'7d'`, `'1h'`, etc.)

### Clear Stale lastLogoutAt
If you need to reset locked-out users (mass reactivation):
```javascript
// MongoDB
db.users.updateMany({ lastLogoutAt: { $lt: ISODate("2024-04-07") } }, { $set: { lastLogoutAt: null } })
db.roles.updateMany({ lastLogoutAt: { $lt: ISODate("2024-04-07") } }, { $set: { lastLogoutAt: null } })
```

## Troubleshooting

### Issue: User can't log in after logout-all
**Check**:
- [ ] User.lastLogoutAt is set in database
- [ ] New login creates token with iat > lastLogoutAt
- [ ] verifyAppToken includes assertUserTokenValid call

**Solution**: Admin calls `/auth/admin/reactivate-user/:userId`

### Issue: Token still works after logout-all
**Check**:
- [ ] assertUserTokenValid is being called
- [ ] User model loaded successfully
- [ ] lastLogoutAt comparison is correct

**Debug**:
```javascript
// Check user's lastLogoutAt
db.users.findById(ObjectId("...")).lastLogoutAt

// Check token iat
// Decode token at jwt.io - look for "iat" claim
// Time: iat * 1000 = milliseconds
```

