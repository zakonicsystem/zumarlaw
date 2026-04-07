import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import User from '../models/User.js';
import Roles from '../models/Roles.js';
import Admin from '../models/Admin.js';
import Session from '../models/Session.js';
import { verifyJWT, tryVerify } from '../middleware/authMiddleware.js';
import { issueToken, verifyAppToken, forceLogoutAllDevices } from '../utils/tokenService.js';

const router = express.Router();

function getDeviceInfo(req) {
  return {
    userAgent: req.headers['user-agent'] || 'Unknown',
    ipAddress: req.ip || req.connection.remoteAddress || 'Unknown',
    deviceName: req.body?.deviceName || 'Unknown Device',
  };
}

async function createSession(userId, token, req) {
  try {
    const decoded = jwt.decode(token);
    const expiresAt = new Date(decoded.exp * 1000);

    const session = new Session({
      userId,
      token,
      deviceInfo: getDeviceInfo(req),
      isActive: true,
      expiresAt,
    });

    await session.save();
    return session;
  } catch (err) {
    console.error('Error creating session:', err);
  }
}

function generateToken(user) {
  const payload = {
    id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phoneNumber: user.phoneNumber,
    CNIC: user.CNIC,
  };

  return issueToken(payload);
}

router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
  session: false,
}));

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login', session: false }),
  async (req, res) => {
    const { user } = req.user;

    const userData = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      CNIC: user.CNIC,
      services: user.services || [],
    };

    const newToken = issueToken(userData);
    await createSession(user._id, newToken, req);
    const redirectUrl = `${process.env.CLIENT_URL}/home?token=${newToken}&user=${encodeURIComponent(JSON.stringify(userData))}`;
    res.redirect(redirectUrl);
  }
);

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide both email and password.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.password) {
      console.warn('[login] User has no local password set:', user._id);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    let isMatch = false;
    try {
      isMatch = await bcrypt.compare(password, user.password);
    } catch (bcryptErr) {
      console.error('[login] bcrypt.compare error:', bcryptErr);
      return res.status(500).json({ message: 'Server error occurred' });
    }

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user);
    await createSession(user._id, token, req);

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        CNIC: user.CNIC,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error occurred' });
  }
});

router.post('/admin-register', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    console.warn('[admin-register] Attempting admin registration for:', email);

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ message: 'All fields required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      isAdmin: true,
    });

    const token = generateToken(user);
    await createSession(user._id, token, req);

    res.status(201).json({
      message: 'Admin created successfully',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    console.error('Admin registration error:', error);
    res.status(500).json({ message: 'Error creating admin', error: error.message });
  }
});

router.post('/signup', async (req, res) => {
  try {
    const { firstName, lastName, CNIC, email, phoneNumber, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        message: 'Missing required fields',
        details: {
          firstName: !firstName && 'First name is required',
          lastName: !lastName && 'Last name is required',
          CNIC: !CNIC && 'CNIC is required',
          email: !email && 'Email is required',
          password: !password && 'Password is required',
        },
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      firstName,
      lastName,
      CNIC,
      email,
      phoneNumber,
      password: hashedPassword,
    });

    const token = generateToken(user);
    await createSession(user._id, token, req);

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        CNIC: user.CNIC,
        email: user.email,
        phoneNumber: user.phoneNumber,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
});

router.post('/mark-admin/:userId', async (req, res) => {
  try {
    console.warn('[mark-admin] Attempting to mark user as admin:', req.params.userId);

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { isAdmin: true },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User marked as admin',
      user: {
        id: user._id,
        email: user.email,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    console.error('Mark admin error:', error);
    res.status(500).json({ message: 'Error updating user', error: error.message });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'No user found with that email' });
    }

    res.status(200).json({ message: 'Email verified. You can reset your password.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/reset-password', async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    if (!email || !newPassword) {
      return res.status(400).json({ message: 'Email and new password are required' });
    }

    const logoutAt = new Date();
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Try User model first
    let user = await User.findOne({ email });
    if (user) {
      user.password = hashedPassword;
      user.lastLogoutAt = logoutAt; // ✅ Invalidate all previous tokens
      await user.save();

      await Session.updateMany(
        { userId: user._id, isActive: true },
        { isActive: false }
      );

      return res.status(200).json({ message: 'Password reset successful. Please login again with your new password.' });
    }

    // ✅ Try Admin model
    let admin = await Admin.findOne({ email });
    if (admin) {
      admin.password = hashedPassword;
      admin.lastLogoutAt = logoutAt;
      await admin.save();

      await Session.updateMany(
        { userId: admin._id, isActive: true },
        { isActive: false }
      );

      return res.status(200).json({ message: 'Password reset successful. Please login again with your new password.' });
    }

    // ✅ Try Roles model (employee)
    let employee = await Roles.findOne({ 'login.email': email });
    if (employee) {
      employee.login.password = hashedPassword;
      employee.lastLogoutAt = logoutAt;
      await employee.save();

      await Session.updateMany(
        { userId: employee._id, isActive: true },
        { isActive: false }
      );

      return res.status(200).json({ message: 'Password reset successful. Please login again with your new password.' });
    }

    return res.status(404).json({ message: 'User not found' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/verify-user', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = await verifyAppToken(token);
    console.log('Decoded:', decoded);

    const user = await User.findById(decoded.id);
    if (!user) {
      console.log('User not found, logging out');
      return res.status(401).json({ message: 'User not found' });
    }

    const session = await Session.findOne({ token, isActive: true });
    if (!session) {
      return res.status(401).json({ message: 'Session expired or logged out. Please login again.' });
    }

    res.status(200).json({ user });
  } catch (err) {
    console.error('JWT Error:', err.message);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
});

router.get('/user/:email', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isAdmin: user.isAdmin,
      isActive: user.isActive,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user', error: error.message });
  }
});

router.get('/whoami', tryVerify, (req, res) => {
  if (req.user) {
    return res.status(200).json({ user: req.user });
  }
  return res.status(401).json({ message: 'Not authenticated' });
});

// ✅ Strict version of whoami that validates session and token revocation
router.get('/verify-session', verifyJWT, async (req, res) => {
  try {
    res.status(200).json({ user: req.user });
  } catch (error) {
    console.error('Verify session error:', error);
    res.status(401).json({ message: 'Session invalid', error: error.message });
  }
});

router.post('/logout', verifyJWT, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader.split(' ')[1];

    const session = await Session.findOneAndUpdate(
      { token, isActive: true },
      { isActive: false },
      { new: true }
    );

    if (!session) {
      return res.status(401).json({ message: 'Session not found or already logged out' });
    }

    res.status(200).json({
      message: 'Logged out from current device successfully',
      deviceInfo: session.deviceInfo,
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Error logging out', error: error.message });
  }
});

router.post('/logout-all', verifyJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const logoutAt = new Date();

    // Update session records
    const result = await Session.updateMany(
      { userId, isActive: true },
      { isActive: false }
    );

    // ✅ Mark user/employee/admin's lastLogoutAt to invalidate all tokens issued before this time
    // Try User model first
    let updated = await User.findByIdAndUpdate(
      userId,
      { lastLogoutAt: logoutAt },
      { new: true }
    );

    // If not found in User, try Roles (employee)
    if (!updated) {
      updated = await Roles.findByIdAndUpdate(
        userId,
        { lastLogoutAt: logoutAt },
        { new: true }
      );
    }

    // ✅ If not found in Roles, try Admin
    if (!updated) {
      updated = await Admin.findByIdAndUpdate(
        userId,
        { lastLogoutAt: logoutAt },
        { new: true }
      );
    }

    res.status(200).json({
      message: 'Logged out from all devices successfully. New login required.',
      sessionsRemoved: result.modifiedCount,
      logoutAt,
    });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({ message: 'Error logging out from all devices', error: error.message });
  }
});

router.post('/logout-all-devices-now', verifyJWT, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const logoutAt = await forceLogoutAllDevices();
    await Session.updateMany({ isActive: true }, { isActive: false });

    res.status(200).json({
      message: 'All logged-in devices have been logged out',
      logoutAt,
    });
  } catch (error) {
    console.error('Global logout error:', error);
    res.status(500).json({ message: 'Error logging out all devices', error: error.message });
  }
});

router.get('/sessions', verifyJWT, async (req, res) => {
  try {
    const userId = req.user.id;

    const sessions = await Session.find({
      userId,
      isActive: true,
    }).sort({ createdAt: -1 });

    const sessionsData = sessions.map((session) => ({
      sessionId: session._id,
      deviceInfo: session.deviceInfo,
      createdAt: session.createdAt,
      lastActivityAt: session.lastActivityAt,
      expiresAt: session.expiresAt,
    }));

    res.status(200).json({
      message: 'Active sessions retrieved',
      sessions: sessionsData,
      totalSessions: sessionsData.length,
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ message: 'Error retrieving sessions', error: error.message });
  }
});

router.post('/logout-device/:sessionId', verifyJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.params;

    const session = await Session.findOneAndUpdate(
      { _id: sessionId, userId, isActive: true },
      { isActive: false },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ message: 'Session not found or already logged out' });
    }

    res.status(200).json({
      message: 'Logged out from device successfully',
      deviceInfo: session.deviceInfo,
    });
  } catch (error) {
    console.error('Logout device error:', error);
    res.status(500).json({ message: 'Error logging out from device', error: error.message });
  }
});

// ✅ Admin endpoint to clear a user's logout status (reactivate user)
router.post('/admin/reactivate-user/:userId', verifyJWT, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { userId } = req.params;

    // Clear lastLogoutAt for User
    let user = await User.findByIdAndUpdate(
      userId,
      { lastLogoutAt: null },
      { new: true }
    );

    // If not found, try Roles
    if (!user) {
      user = await Roles.findByIdAndUpdate(
        userId,
        { lastLogoutAt: null },
        { new: true }
      );
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      message: 'User reactivated. They can now log in again.',
      userId: user._id,
    });
  } catch (error) {
    console.error('Reactivate user error:', error);
    res.status(500).json({ message: 'Error reactivating user', error: error.message });
  }
});

export default router;
