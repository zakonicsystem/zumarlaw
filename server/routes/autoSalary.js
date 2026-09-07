import express from 'express';
import Attendance from '../models/Attendance.js';
import Roles from '../models/Roles.js';
import Payroll from '../models/Payroll.js';
import { calculateSalary } from '../utils/calculateSalary.js';
import { payrollPeriod, employeeCountsForSalaryMonth, payrollIdentity, existingPayrollQuery, auditEntry } from '../utils/payrollRules.js';
const router = express.Router();
router.post('/calculate', async (req,res) => {
  let period;
  try { period = payrollPeriod(req.body.year,req.body.month); } catch (error) { return res.status(400).json({message:error.message}); }
  try {
    const employees = (await Roles.find()).filter(emp => employeeCountsForSalaryMonth(emp,period.year,period.month));
    const rows = [];
    for (const emp of employees) {
      const records = await Attendance.find({ employeeId: emp._id, date: { $regex: '^' + period.key } });
      rows.push({ employeeId: emp._id, employee: emp.name, email: emp.email, branch: emp.branch || '-', ...calculateSalary(emp.salary,records,period.year,period.month,emp) });
    }
    res.json(rows);
  } catch { res.status(500).json({message:'Could not calculate salaries'}); }
});
router.post('/', async (req,res) => {
  let period;
  try { period = payrollPeriod(req.body.year,req.body.month); } catch(error) { return res.status(400).json({error:error.message}); }
  const payrolls = []; const skipped = [];
  try {
    const employees = (await Roles.find()).filter(emp => employeeCountsForSalaryMonth(emp,period.year,period.month));
    for (const emp of employees) {
      const existing = await Payroll.findOne(existingPayrollQuery(emp,period.key));
      if (existing) { skipped.push(emp.name); continue; }
      const records = await Attendance.find({ employeeId: emp._id, date: { $regex: '^' + period.key } });
      const breakdown = calculateSalary(emp.salary,records,period.year,period.month,emp);
      try {
        const payroll = new Payroll({ payrollKey: payrollIdentity(emp,period.key), employeeId: emp._id, payrollMonth: period.key,
          branch: emp.branch || '', employee: emp.name, salary: breakdown.finalSalary,
          calculationSource: 'attendance', calculationVersion: 2, salaryBreakdown: breakdown,
          auditHistory: [auditEntry(req.user,'created',null,{salary:breakdown.finalSalary},'Attendance calculation')] });
        await payroll.save(); payrolls.push(payroll);
      } catch(error) { if(error.code === 11000) skipped.push(emp.name); else throw error; }
    }
    res.json({ success:true, payrolls, skipped });
  } catch { res.status(500).json({error:'Payroll creation stopped. Retry safely; existing records will be skipped.',created:payrolls.length}); }
});
export default router;
