import express from 'express';
import Attendance from '../models/Attendance.js';
import Roles from '../models/Roles.js';
import Payroll from '../models/Payroll.js';
import { calculateSalary } from '../utils/calculateSalary.js';

const router = express.Router();

function employeeCountsForSalaryMonth(employee, year, month) {
  if (employee.employmentStatus !== 'terminated' || !employee.terminatedAt) return true;

  const monthEnd = new Date(Number(year), Number(month), 0);
  return new Date(employee.terminatedAt) > monthEnd;
}

// POST /autoSalary/calculate
// { year, month }
router.post('/calculate', async (req, res) => {
  const { year, month } = req.body;
  if (!year || !month) return res.status(400).json({ message: 'Missing year or month' });

  try {
  const employees = (await Roles.find()).filter((employee) => employeeCountsForSalaryMonth(employee, year, month));
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
      const calculation = calculateSalary(emp.salary, records, year, month);
      results.push({
        employee: emp.name,
        email: emp.email,
        branch: emp.branch || '-',
        ...calculation
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
    const employees = (await Roles.find()).filter((employee) => employeeCountsForSalaryMonth(employee, year, month));
    const payrolls = [];
    for (const emp of employees) {
      // Get all attendance for this employee in the month/year
      const records = await Attendance.find({
        employeeId: emp._id,
        date: { $regex: `^${year}-` + String(month).padStart(2, '0') }
      });
      const { finalSalary: salary } = calculateSalary(emp.salary, records, year, month);
      // Create payroll record
      const payroll = new Payroll({
        payrollMonth: `${year}-${String(month).padStart(2, '0')}`,
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
