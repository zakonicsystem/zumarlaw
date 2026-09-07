import { sendEmployeeSetup } from '../utils/employeeSetup.js';
import express from 'express';
import Roles from '../models/Roles.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const router = express.Router();

// Get all employees (roles)
router.get('/roles', async (req, res) => {
  try {
    const roles = await Roles.find();
    const mayReadSalary = req.user.role === 'admin' || req.user.assignedPages?.some(p => ['/admin/payroll','/admin/salary','/admin/roles'].includes(p));
    res.json(mayReadSalary ? roles : roles.map(r => ({_id:r._id,name:r.name,email:r.email,branch:r.branch,employmentStatus:r.employmentStatus,terminatedAt:r.terminatedAt})));
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch employees' });
  }
});

// Get a single employee by ID
router.get('/roles/:id', async (req, res) => {
  if(req.user.role !== 'admin' && !req.user.assignedPages?.includes('/admin/roles')) return res.sendStatus(403);
  try {
    const role = await Roles.findById(req.params.id);
    if (!role) return res.status(404).json({ message: 'Employee not found' });
    res.json(role);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch employee' });
  }
});

// Create a new employee
router.post('/roles', async (req, res) => {
  try {
    // No shared default password; the employee chooses one through an expiring invitation.
    const plainPassword = crypto.randomBytes(32).toString('hex');
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const newRole = new Roles({
      ...Object.fromEntries(Object.entries(req.body).filter(([key]) => ['name','phone','email','cnic','role','salary','branch','assignedPages','tasks','canViewAllLeads','canViewAllServices'].includes(key))),
      login: {
        email: req.body.email,
        password: hashedPassword
      }
    });

    await newRole.save();
    let invitationSent = false;
    try { await sendEmployeeSetup(newRole); invitationSent = true; } catch { console.error('Employee invitation delivery failed'); }

    res.status(201).json({
      message: 'Employee created successfully',
      employee: newRole,
      invitationSent,
      setupMessage: invitationSent ? 'Password setup link sent to the employee email.' : 'Employee created. Use Forgot Password to request a code, or resend the invitation.'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create employee' });
  }
});

router.post('/roles/:id/invite', async (req, res) => {
  try {
    const employee = await Roles.findById(req.params.id);
    if (!employee || employee.employmentStatus === 'terminated') return res.status(404).json({ message: 'Active employee not found' });
    await sendEmployeeSetup(employee);
    res.json({ message: 'Setup link sent' });
  } catch { res.status(503).json({ message: 'Could not send setup link. Employee can use Forgot Password.' }); }
});

// Update an employee
router.put('/roles/:id', async (req, res) => {
  try {
    const allowed = ['name','phone','email','cnic','role','salary','branch','assignedPages','tasks','canViewAllLeads','canViewAllServices'];
    const update = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    if (update.email) update['login.email'] = update.email;
    if (
      Object.prototype.hasOwnProperty.call(update, 'canViewAllLeads') ||
      Object.prototype.hasOwnProperty.call(update, 'canViewAllServices')
    ) {
      // Retire the legacy combined flag once the independent controls are saved.
      update.canViewAllLeadsAndServices = false;
    }
    const updatedRole = await Roles.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!updatedRole) return res.status(404).json({ message: 'Employee not found' });
    res.json({ message: 'Employee updated successfully', employee: updatedRole });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Terminate an employee. Terminated employees are kept for history but excluded from future salary/attendance.
router.patch('/roles/:id/terminate', async (req, res) => {
  try {
    const { terminatedAt, reason } = req.body;
    const terminationDate = terminatedAt ? new Date(terminatedAt) : new Date();
    if (Number.isNaN(terminationDate.getTime())) {
      return res.status(400).json({ message: 'Invalid termination date' });
    }

    const updatedRole = await Roles.findByIdAndUpdate(
      req.params.id,
      {
        employmentStatus: 'terminated',
        terminatedAt: terminationDate,
        terminatedReason: reason || '',
        assignedPages: []
      },
      { new: true }
    );

    if (!updatedRole) return res.status(404).json({ message: 'Employee not found' });
    res.json({ message: 'Employee terminated successfully', employee: updatedRole });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Re-activate a previously terminated employee.
router.patch('/roles/:id/unterminate', async (req, res) => {
  try {
    const updatedRole = await Roles.findByIdAndUpdate(
      req.params.id,
      {
        employmentStatus: 'active',
        terminatedAt: null,
        terminatedReason: ''
      },
      { new: true }
    );

    if (!updatedRole) return res.status(404).json({ message: 'Employee not found' });
    res.json({ message: 'Employee restored successfully', employee: updatedRole });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete an employee
router.delete('/roles/:id', async (req, res) => {
  try {
    const deleted = await Roles.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Employee not found' });
    res.json({ message: 'Employee deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

export default router;
