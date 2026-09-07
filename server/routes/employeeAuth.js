import crypto from 'crypto';
import bcrypt from 'bcrypt';
import express from 'express';
import { employeeLogin, employeeForgotPassword, employeeResetPassword } from '../controllers/employeeAuthController.js';
import { verifyJWT } from '../middleware/authMiddleware.js';
import Roles from '../models/Roles.js';


const router = express.Router();

router.post('/employee-setup', async (req, res) => {
  const { token, newPassword } = req.body;
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token) || typeof newPassword !== 'string' || newPassword.length < 10 || Buffer.byteLength(newPassword) > 72) return res.status(400).json({ message: 'Use a valid setup link and a password of at least 10 characters (maximum 72 bytes).' });
  try {
    const password = await bcrypt.hash(newPassword, 12);
    const employee = await Roles.findOneAndUpdate({ setupTokenHash: crypto.createHash('sha256').update(token).digest('hex'), setupExpiresAt: { $gt: new Date() }, employmentStatus: { $ne: 'terminated' } }, { $set: { 'login.password': password }, $unset: { setupTokenHash: 1, setupExpiresAt: 1 } });
    if (!employee) return res.status(400).json({ message: 'Setup link expired or already used. Use Forgot Password.' });
    res.json({ message: 'Password set. You can now sign in.' });
  } catch { res.status(500).json({ message: 'Could not complete account setup' }); }
});
// Employee login
router.post('/employee-login', async (req, res, next) => {
  return employeeLogin(req, res, next);
});
// Employee forgot password (request reset)
router.post('/employee-forgot-password', async (req, res, next) => {
  return employeeForgotPassword(req, res, next);
});
// Employee reset password
router.post('/employee-reset-password', async (req, res, next) => {
  return employeeResetPassword(req, res, next);
});
// server/routes/employeeAuth.js or similar

router.get('/employee/me', verifyJWT, async (req, res) => {
  console.log('[ROUTE] GET /employee/me', req.user);
  const employee = await Roles.findById(req.user.id);
  if (!employee) {
    console.error('[ROUTE] /employee/me: Employee not found for id', req.user.id);
    return res.status(404).json({ error: 'Employee not found' });
  }
  res.json({
    name: employee.name,
    email: employee.login?.email,
    assignedPages: employee.assignedPages,
    canViewAllLeads: employee.canViewAllLeads === true || employee.canViewAllLeadsAndServices === true,
    canViewAllServices: employee.canViewAllServices === true || employee.canViewAllLeadsAndServices === true
  });
});
export default router;
