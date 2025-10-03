import express from 'express';
import Attendance from '../models/Attendance.js';
import Roles from '../models/Roles.js';
import Payroll from '../models/Payroll.js';

const router = express.Router();

// Utility: get all dates in month/year
function getMonthDates(year, month) {
  const dates = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    dates.push(new Date(year, month - 1, day));
  }
  return dates;
}

// POST /autoSalary/calculate
// { year, month }
router.post('/calculate', async (req, res) => {
  const { year, month } = req.body;
  if (!year || !month) return res.status(400).json({ message: 'Missing year or month' });

  try {
    const employees = await Roles.find({ role: 'employee' });
    const results = [];
    if (employees.length === 0) {
      return res.json([]);
    }
    for (const emp of employees) {
      const attendance = await Attendance.find({
        employeeId: emp._id,
        date: { $regex: `^${year}-` + String(month).padStart(2, '0') }
      });
      let absent = 0, leave = 0, holiday = 0, present = 0, leaveRelief = 0;
      attendance.forEach(a => {
        if (a.holiday) holiday++;
        else if (a.leaveRelief) leaveRelief++;
        else if (a.leave) leave++;
        else if (a.present) present++;
        else if (a.absent) absent++;
      });
      const monthDates = getMonthDates(year, month);
      const sundays = monthDates.filter(d => d.getDay() === 0).length;
      const baseSalary = parseFloat(emp.salary || '0');
      let daysInMonth = monthDates.length;
      let workingDays = daysInMonth - sundays - holiday;
      let perDaySalary = baseSalary / (workingDays || 1);
  // Calculate extra leaves (leave relief does NOT cancel extra leave)
  let extraLeaves = Math.max(0, leave - 2);
  let cutDays = absent + extraLeaves;
  let finalSalary = baseSalary - (cutDays * perDaySalary);
      results.push({
        employee: emp.name,
        email: emp.email,
        branch: emp.branch || '-',
        baseSalary,
        present,
        absent,
        leave,
        holiday,
        leaveRelief,
        sundays,
        cutDays,
        finalSalary: Math.round(finalSalary)
      });
    }
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
// POST /auto-salary - Calculate and create payroll for all employees for a given month/year
router.post('/', async (req, res) => {
  const { month, year, paidBy, paymentDate, paymentMethod } = req.body;
  if (!month || !year) return res.status(400).json({ error: 'Month and year required' });
  try {
    // Get all employees
    const employees = await Roles.find();
    const payrolls = [];
    for (const emp of employees) {
      // Get all attendance for this employee in the month/year
      const records = await Attendance.find({
        employeeId: emp._id,
        date: { $regex: `^${year}-` + (month < 10 ? `0${month}` : month) }
      });
      // Count absents, leaves, holidays, Sundays
      let absent = 0, leave = 0, holiday = 0, sunday = 0, present = 0;
      records.forEach(r => {
        const d = new Date(r.date);
        if (r.holiday) holiday++;
        else if (d.getDay() === 0) sunday++; // Sunday is 0
        else if (r.leave) leave++;
        else if (r.present) present++;
        else absent++;
      });
      // Salary logic
      let baseSalary = parseFloat(emp.salary);
      let daysInMonth = new Date(year, month, 0).getDate();
      let workingDays = daysInMonth - sunday - holiday;
      let perDaySalary = baseSalary / workingDays;
      let salary = baseSalary;
      salary -= absent * perDaySalary;
      if (leave > 2) salary -= perDaySalary;
      // Create payroll record
      const payroll = new Payroll({
        payrollMonth: `${year}-${month < 10 ? `0${month}` : month}`,
        branch: emp.branch || '',
        employee: emp.name,
        paidBy: paidBy || 'Auto',
        salary: Math.round(salary),
        paymentDate: paymentDate || new Date(),
        paymentMethod: paymentMethod || 'Auto'
      });
      await payroll.save();
      payrolls.push(payroll);
    }
    res.json({ success: true, payrolls });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
