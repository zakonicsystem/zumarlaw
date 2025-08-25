import express from 'express';
import Attendance from '../models/Attendance.js';
import Roles from '../models/Roles.js';

const router = express.Router();

// Mark attendance for an employee
router.post('/mark', async (req, res) => {
  const { employeeId, present } = req.body;
  if (!employeeId || typeof present !== 'boolean') {
    return res.status(400).json({ message: 'Missing employeeId or present status' });
  }
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 8); // HH:mm:ss
  try {
    // Get employee email
    const employee = await Roles.findById(employeeId);
    const email = employee ? employee.email : '';
    // Upsert attendance for today
    const attendance = await Attendance.findOneAndUpdate(
      { employeeId, date: today },
      { present, time: currentTime, email },
      { upsert: true, new: true }
    );
    res.json(attendance);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get attendance history (day-wise)
router.get('/history', async (req, res) => {
  try {
    const records = await Attendance.find().populate('employeeId', 'name email');
    // Group by date
    const history = records.map(r => ({
      date: r.date,
      time: r.time || (r.createdAt ? new Date(r.createdAt).toLocaleTimeString() : '-'),
      employeeName: r.employeeId?.name || 'Unknown',
      employeeEmail: r.email || (r.employeeId?.email || '-'),
      present: r.present
    }));
    res.json(history);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get attendance history for a single employee
router.get('/history/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const records = await Attendance.find({ employeeId }).populate('employeeId', 'name email');
    const history = records.map(r => ({
      date: r.date,
      time: r.time || (r.createdAt ? new Date(r.createdAt).toLocaleTimeString() : '-'),
      employeeName: r.employeeId?.name || 'Unknown',
      employeeEmail: r.email || (r.employeeId?.email || '-'),
      present: r.present
    }));
    res.json(history);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

export default router;
