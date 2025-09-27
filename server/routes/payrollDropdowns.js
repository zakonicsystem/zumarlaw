import express from 'express';
const router = express.Router();

// Mock data for dropdowns (replace with DB queries as needed)
const branches = ['Chaburji Branch', 'Gulberg Branch'];
const employees = ['Moqeet', 'Ali', 'Sara'];
const payers = ['Arslan', 'Ahmed'];
const months = ['January 2025', 'February 2025', 'March 2025'];

router.get('/branches', (req, res) => res.json(branches));
router.get('/employees', (req, res) => res.json(employees));
router.get('/payers', (req, res) => res.json(payers));
router.get('/payroll-months', (req, res) => res.json(months));

export default router;
