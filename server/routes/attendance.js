// Edit previous attendance (by date and employee)

import express from 'express';
import Attendance from '../models/Attendance.js';
import Roles from '../models/Roles.js';

const router = express.Router();

// Mark attendance for an employee
router.post('/mark', async (req, res) => {
  const { employeeId, present, leave, holiday, halfDay, leaveRelief, absent } = req.body;
  if (!employeeId) {
    return res.status(400).json({ message: 'Missing employeeId' });
  }
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 8); // HH:mm:ss
  try {
    const employee = await Roles.findById(employeeId);
    const email = employee ? employee.email : '';
    const attendance = await Attendance.findOneAndUpdate(
      { employeeId, date: today },
      {
        present: !!present,
        leave: !!leave,
        holiday: !!holiday,
        halfDay: !!halfDay,
        leaveRelief: !!leaveRelief,
        absent: !!absent,
        time: currentTime,
        email
      },
      { upsert: true, new: true }
    );
    res.json(attendance);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
router.patch('/edit', async (req, res) => {
  const { employeeId, date, present, leave, holiday, halfDay, leaveRelief, absent } = req.body;
  if (!employeeId || !date) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  try {
    const attendance = await Attendance.findOneAndUpdate(
      { employeeId, date },
      {
        present: !!present,
        leave: !!leave,
        holiday: !!holiday,
        halfDay: !!halfDay,
        leaveRelief: !!leaveRelief,
        absent: !!absent
      },
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
    const { year, month, employeeId } = req.query;
    const query = {};
    if (employeeId) query.employeeId = employeeId;
    if (year && month) {
      const monthStr = String(month).padStart(2, '0');
      query.date = { $regex: `^${year}-${monthStr}` };
    }
    const records = await Attendance.find(query).populate('employeeId', 'name email');
    // Map to history format
    const history = records.map(r => ({
      date: r.date,
      time: r.time || (r.createdAt ? new Date(r.createdAt).toLocaleTimeString() : '-'),
      employeeName: r.employeeId?.name || 'Unknown',
      employeeEmail: r.email || (r.employeeId?.email || '-'),
      present: r.present,
      leave: r.leave || false,
      holiday: r.holiday || false,
      halfDay: r.halfDay || false,
      leaveRelief: r.leaveRelief || false,
      absent: r.absent || false
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
      present: r.present,
      leave: r.leave || false,
      holiday: r.holiday || false,
      halfDay: r.halfDay || false,
      leaveRelief: r.leaveRelief || false,
      absent: r.absent || false
    }));
    res.json(history);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

export default router;
