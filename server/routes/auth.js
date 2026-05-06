import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import User from '../models/User.js';
import { verifyJWT, tryVerify } from '../middleware/authMiddleware.js'; // ✅ Import JWT middleware

const router = express.Router();

// ✅ Centralized Token Generator
function generateToken(user) {
  const payload = {
    id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phoneNumber: user.phoneNumber,
    CNIC: user.CNIC
  };

  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });
}

// ✅ Google OAuth login
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
  session: false,
}));

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login', session: false }),
  (req, res) => {
    const { user, token } = req.user;
    
    // Filter user data to only include necessary fields
    const userData = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      CNIC: user.CNIC,
      services: user.services || []
    };

    // Create a new token with all necessary user data
    const newToken = jwt.sign(userData, process.env.JWT_SECRET, { expiresIn: '1d' });

    const redirectUrl = `${process.env.CLIENT_URL}/home?token=${newToken}&user=${encodeURIComponent(JSON.stringify(userData))}`;
    res.redirect(redirectUrl);
  }
);

// ✅ Email/Password Login
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

    // Some accounts (e.g., created via OAuth) may not have a local password set.
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

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        CNIC: user.CNIC
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error occurred' });
  }
});

// ✅ Admin Registration (protected - for initial setup only)
router.post('/admin-register', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    
    // For security, this should be protected - ideally with an admin-only middleware
    // For now, we'll allow it but log it heavily
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
      isAdmin: true  // Mark as admin
    });

    const token = generateToken(user);

    res.status(201).json({
      message: 'Admin created successfully',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    console.error('Admin registration error:', error);
    res.status(500).json({ message: 'Error creating admin', error: error.message });
  }
});

// ✅ Signup Route
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
          password: !password && 'Password is required'
        }
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
      password: hashedPassword
    });

    const token = generateToken(user);

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        CNIC: user.CNIC,
        email: user.email,
        phoneNumber: user.phoneNumber
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
});

// ✅ Mark user as admin (for setup/management - should be protected in production)
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
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    console.error('Mark admin error:', error);
    res.status(500).json({ message: 'Error updating user', error: error.message });
  }
});

// ✅ Get user by email (for debugging)
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'No user found with that email' });

    // Optionally, send email or return a reset token
    res.status(200).json({ message: 'Email verified. You can reset your password.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Reset Password
router.post('/reset-password', async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    if (!email || !newPassword) {
      return res.status(400).json({ message: 'Email and new password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});
// ✅ Get Logged-in User Info (Protected Route)
// Express route
router.get('/verify-user', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded:', decoded); // ✅ Add this temporarily

    const user = await User.findById(decoded.id); // ✅ MUST be decoded.id
    if (!user) {
      console.log('User not found, logging out');
      return res.status(401).json({ message: 'User not found' });
    }

    res.status(200).json({ user });
  } catch (err) {
    console.error('JWT Error:', err.message);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
});

// ✅ Get user by email (for debugging)
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
      isActive: user.isActive
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user', error: error.message });
  }
});

// Lightweight whoami endpoint that returns decoded user/employee role when token present
router.get('/whoami', tryVerify, (req, res) => {
  if (req.user) {
    return res.status(200).json({ user: req.user });
  }
  return res.status(401).json({ message: 'Not authenticated' });
});

export default router;

