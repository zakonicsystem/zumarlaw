
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Roles from '../models/Roles.js';

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;
console.log('[DEBUG] JWT_SECRET from env:', process.env.JWT_SECRET);
// Employee Login
export const employeeLogin = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  try {
    const employee = await Roles.findOne({ 'login.email': email });
    if (!employee) {
      console.error('[employeeLogin] Employee not found for email:', email);
      return res.status(400).json({ message: 'Employee not found' });
    }
    const isMatch = await bcrypt.compare(password, employee.login.password);
    if (!isMatch) {
      console.error('[employeeLogin] Invalid password for email:', email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    if (!JWT_SECRET) {
      console.error('[employeeLogin] JWT_SECRET is not set!');
      return res.status(500).json({ message: 'JWT secret not set on server' });
    }
    const token = jwt.sign({
      id: employee._id,
      email: employee.login.email,
      role: employee.role,
      assignedPages: employee.assignedPages || []
    }, JWT_SECRET, { expiresIn: '1d' });
    return res.status(200).json({
      message: 'Login successful',
      token,
      assignedPages: employee.assignedPages || []
    });
  } catch (err) {
    console.error('[employeeLogin] Server error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Employee Forgot Password (request reset)
export const employeeForgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });
  try {
    const employee = await Roles.findOne({ 'login.email': email });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    // For demo: generate a reset token (in production, email this)
    const resetToken = jwt.sign({ id: employee._id }, JWT_SECRET, { expiresIn: '15m' });
    // You could store this token in DB or send via email
    return res.json({ message: 'Reset token generated', resetToken });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// Employee Reset Password
export const employeeResetPassword = async (req, res) => {
  const { resetToken, newPassword } = req.body;
  if (!resetToken || !newPassword) return res.status(400).json({ message: 'Token and new password required' });
  try {
    const decoded = jwt.verify(resetToken, JWT_SECRET);
    const employee = await Roles.findById(decoded.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    const hashed = await bcrypt.hash(newPassword, 10);
    employee.login.password = hashed;
    await employee.save();
    return res.json({ message: 'Password reset successful' });
  } catch (err) {
    return res.status(400).json({ message: 'Invalid or expired token' });
  }
};
