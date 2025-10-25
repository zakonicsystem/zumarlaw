import express from 'express';
import bcrypt from 'bcrypt';
import Admin from '../models/Admin.js';
import jwt from 'jsonwebtoken';
import { authenticateAdmin } from '../middleware/authMiddleware.js'; 
import User from '../models/User.js'; // Add this import for customer data

const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: 'Email and password required' });

  const admin = await Admin.findOne({ email });
  if (!admin) return res.status(401).json({ message: 'Invalid credentials' });

  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

  const token = jwt.sign(
    { id: admin._id, email: admin.email, role: 'admin' }, // ✅ include role
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  res.json({ message: 'Logged in', token });
});

router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.status(200).json({ message: 'Logged out successfully' });
});

router.get("/", (req, res) => {
  res.json({ message: "Admin Info Loaded" });
});

// Add this route to provide customers for admin
router.get('/customers', async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    const transformedUsers = users.map(user => ({
      _id: user._id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      password: user.password,  
      phone: user.phoneNumber || 'N/A',
      createdAt: user.createdAt,
      services: user.services || [],
      isActive: user.isActive !== false // default true
    }));
    res.status(200).json(transformedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Reset a customer's password and return the new plaintext password once
router.post('/customers/:id/reset-password', authenticateAdmin, async (req, res) => {
  try {
    const { newPassword } = req.body;
    // If admin didn't provide a password, generate a random temporary one
    const generateTemp = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*';
      let out = '';
      for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)];
      return out;
    };

    const plain = newPassword && newPassword.length >= 6 ? newPassword : generateTemp();
    const hashed = await bcrypt.hash(plain, 10);

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { password: hashed },
      { new: true }
    );

    if (!user) return res.status(404).json({ message: 'User not found' });

    // Return the plaintext only once to the admin who called the endpoint
    res.status(200).json({ message: 'Password reset successful', newPassword: plain });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Get a single customer's full data (including password hash)
router.get('/customers/:id', authenticateAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.status(200).json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: user.password,
      phone: user.phoneNumber,
      createdAt: user.createdAt,
      services: user.services || [],
      isActive: user.isActive
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
