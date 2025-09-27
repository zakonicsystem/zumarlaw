import express from 'express';
import { employeeLogin, employeeForgotPassword, employeeResetPassword } from '../controllers/employeeAuthController.js';
import { verifyJWT } from '../middleware/authMiddleware.js';
import Roles from '../models/Roles.js';


const router = express.Router();

// Employee login
router.post('/employee-login', async (req, res, next) => {
  console.log('[ROUTE] POST /employee-login', req.body);
  return employeeLogin(req, res, next);
});
// Employee forgot password (request reset)
router.post('/employee-forgot-password', async (req, res, next) => {
  console.log('[ROUTE] POST /employee-forgot-password', req.body);
  return employeeForgotPassword(req, res, next);
});
// Employee reset password
router.post('/employee-reset-password', async (req, res, next) => {
  console.log('[ROUTE] POST /employee-reset-password', req.body);
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
  res.json({ assignedPages: employee.assignedPages });
});
export default router;
