import express from 'express';
import Roles from '../models/Roles.js';
const router = express.Router();

// Mock data for dropdowns (replace with DB queries as needed)
const branches = ['Chaburji Branch', 'Gulberg Branch'];
const payers = ['Arslan', 'Ahmed'];
const months = ['January 2025', 'February 2025', 'March 2025'];

router.get('/branches', (req, res) => res.json(branches));
router.get('/employees', async (req, res) => {
  try {
    const employees = await Roles.find({ employmentStatus: { $ne: 'terminated' } }).select('name');
    res.json(employees.map((employee) => employee.name).filter(Boolean));
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch employees' });
  }
});
router.get('/payers', (req, res) => res.json(payers));
router.get('/payroll-months', (req, res) => res.json(months));

export default router;
