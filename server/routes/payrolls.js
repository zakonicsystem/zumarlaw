import express from 'express';
const router = express.Router();
import Payroll from '../models/Payroll.js';
import Roles from '../models/Roles.js';

const payrollMonthCountsForEmployee = (employee, payrollMonth) => {
  if (!employee || employee.employmentStatus !== 'terminated' || !employee.terminatedAt || !payrollMonth) return true;

  const monthText = String(payrollMonth).slice(0, 7);
  const [year, month] = monthText.split('-').map(Number);
  if (!year || !month) return true;

  const monthEnd = new Date(year, month, 0);
  return new Date(employee.terminatedAt) > monthEnd;
};

// POST /payrolls - Create new payroll
router.post('/', async (req, res) => {
  try {
    const employee = await Roles.findOne({ name: req.body.employee });
    if (!payrollMonthCountsForEmployee(employee, req.body.payrollMonth)) {
      return res.status(400).json({ error: 'Cannot create payroll for this employee after termination date' });
    }
    const payroll = new Payroll(req.body);
    await payroll.save();
    res.status(201).json(payroll);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// (Optional) GET /payrolls - List all payrolls
router.get('/', async (req, res) => {
  try {
    const payrolls = await Payroll.find().sort({ createdAt: -1 });
    res.json(payrolls);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /payrolls/:id - Delete a payroll by ID
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Payroll.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: 'Payroll not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /payrolls/:id - Update a payroll by ID
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Payroll.findByIdAndUpdate(id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Payroll not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /payrolls/:id - Get a payroll by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const payroll = await Payroll.findById(id);
    if (!payroll) return res.status(404).json({ error: 'Payroll not found' });
    res.json(payroll);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
