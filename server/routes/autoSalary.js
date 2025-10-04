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
  // Include all roles so calculation runs for any user with a salary record
  const employees = await Roles.find();
  console.log('[autoSalary] employees found:', employees.length);
    const results = [];
    if (employees.length === 0) {
      return res.json([]);
    }
    for (const emp of employees) {
      // fetch attendance records for the employee for the month
      const records = await Attendance.find({
        employeeId: emp._id,
        date: { $regex: `^${year}-` + String(month).padStart(2, '0') }
      });
      console.log(`[autoSalary] emp=${emp.name} records=${records.length}`);
      // build map date->record
      const recMap = {};
      records.forEach(r => { recMap[r.date] = r; });
      const daysInMonth = new Date(year, month, 0).getDate();
  let sundays = 0, present = 0, leave = 0, leaveRelief = 0, holiday = 0, absent = 0, halfDay = 0;
      for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(year, month - 1, day);
        const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (d.getDay() === 0) {
          // Sunday (paid)
          sundays++;
        }
        const rec = recMap[iso];
        if (rec) {
          if (rec.holiday) {
            holiday++; // holiday is paid
          } else if (rec.leaveRelief) {
            leaveRelief++;
          } else if (rec.halfDay) {
            halfDay++; present++; // half-day treated as paid
          } else if (rec.leave) {
            leave++;
          } else if (rec.present) {
            present++;
          } else if (rec.absent) {
            absent++;
          } else {
            absent++;
          }
        } else {
          // no record
          if (d.getDay() === 0) {
            // Sunday with no record -> paid, do nothing
          } else {
            // non-Sunday no record -> absent
            absent++;
          }
        }
      }
      const baseSalary = parseFloat(emp.salary || '0') || 0;
    // Sundays and holidays are paid; workingDays = full month days
    const workingDays = daysInMonth;
    const perDaySalary = baseSalary / (workingDays || 1);
    const extraLeaves = Math.max(0, leave - 2);
    // half-day is paid complete and does not count as cut
    const cutDays = absent + extraLeaves;
      const finalSalary = Math.round(baseSalary - (cutDays * perDaySalary));
      results.push({
        employee: emp.name,
        email: emp.email,
        branch: emp.branch || '-',
        baseSalary,
        present,
        absent,
        halfDay,
        leave,
        holiday,
        leaveRelief,
        sundays,
        cutDays,
        finalSalary
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
      // build map and iterate all days to compute counts consistently
      const recMap = {};
      records.forEach(r => { recMap[r.date] = r; });
      const daysInMonth = new Date(year, month, 0).getDate();
  let sundays = 0, present = 0, leave = 0, leaveRelief = 0, holiday = 0, absent = 0, halfDay = 0;
      for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(year, month - 1, day);
        const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (d.getDay() === 0) {
          // Sunday (paid)
          sundays++;
        }
        const rec = recMap[iso];
        if (rec) {
          if (rec.holiday) {
            holiday++; // holiday is paid
          } else if (rec.leaveRelief) {
            leaveRelief++;
          } else if (rec.halfDay) {
            halfDay++; present++; // half-day treated as paid
          } else if (rec.leave) {
            leave++;
          } else if (rec.present) {
            present++;
          } else if (rec.absent) {
            absent++;
          } else {
            absent++;
          }
        } else {
          // no record
          if (d.getDay() === 0) {
            // Sunday with no record -> paid, do nothing
          } else {
            // non-Sunday no record -> absent
            absent++;
          }
        }
      }
      // Salary logic
      let baseSalary = parseFloat(emp.salary || '0') || 0;
      // Sundays and holidays are paid; workingDays = full month days
      let workingDays = daysInMonth;
      let perDaySalary = baseSalary / (workingDays || 1);
      let extraLeaves = Math.max(0, leave - 2);
      // half-day is paid complete and does not reduce salary
      const cutDays = absent + extraLeaves;
      let salary = Math.round(baseSalary - (cutDays * perDaySalary));
      // Create payroll record
      const payroll = new Payroll({
        payrollMonth: `${year}-${month < 10 ? `0${month}` : month}`,
        branch: emp.branch || '',
        employee: emp.name,
        paidBy: paidBy || 'Auto',
        salary,
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
