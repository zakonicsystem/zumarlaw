import express from 'express';
import Payroll from '../models/Payroll.js';
import Roles from '../models/Roles.js';
import Attendance from '../models/Attendance.js';
import { payrollPeriod, employeeCountsForSalaryMonth, payrollIdentity, existingPayrollQuery, auditEntry } from '../utils/payrollRules.js';
import { calculateSalary } from '../utils/calculateSalary.js';
const router = express.Router();
const fail = (res,error) => res.status(error.code === 11000 ? 409 : 400).json({error:error.code === 11000 ? 'Payroll already exists for this employee and month' : error.message});
export function validatePayrollAmount(value) {
  if (value === '' || value == null || !Number.isFinite(Number(value)) || Number(value) < 0) throw new Error('Salary must be a non-negative number');
  return Math.round(Number(value));
}
router.post('/', async (req,res) => {
  try {
    const [year,month] = String(req.body.payrollMonth || '').split('-'); const period = payrollPeriod(year,month);
    const matches = await Roles.find(req.body.employeeId ? {_id:req.body.employeeId} : {name:req.body.employee,branch:req.body.branch});
    if (matches.length !== 1) throw new Error('Select a unique employee and branch');
    const emp = matches[0];
    if (!employeeCountsForSalaryMonth(emp,period.year,period.month)) throw new Error('Employee was terminated before this payroll month');
    if (await Payroll.findOne(existingPayrollQuery(emp,period.key))) return res.status(409).json({error:'Payroll already exists for this employee and month'});
    const salary = validatePayrollAmount(req.body.salary);
    const payroll = await Payroll.create({ payrollKey:payrollIdentity(emp,period.key),employeeId:emp._id,payrollMonth:period.key,branch:emp.branch,employee:emp.name,salary,calculationSource:'manual',status:'Unpaid',
      paymentMethod: String(req.body.paymentMethod || ''), auditHistory:[auditEntry(req.user,'created',null,{salary},'Manual payroll')] });
    res.status(201).json(payroll);
  } catch(error) { fail(res,error); }
});
router.get('/', async (req,res) => { try { res.json(await Payroll.find().sort({createdAt:-1})); } catch { res.status(500).json({error:'Could not load payrolls'}); } });
router.post('/:id/recalculate', async (req,res) => {
  try {
    const record = await Payroll.findById(req.params.id);
    if (!record) return res.sendStatus(404);
    if (['Paid','Voided'].includes(record.status)) return res.status(409).json({error:'Paid payroll is locked. Record a separate authorized adjustment.'});
    const matches = await Roles.find(record.employeeId ? {_id:record.employeeId} : {name:record.employee,branch:record.branch});
    if (matches.length !== 1) throw new Error('Employee could not be uniquely identified');
    const emp = matches[0]; const [year,month] = record.payrollMonth.split('-'); const period = payrollPeriod(year,month);
    if (!employeeCountsForSalaryMonth(emp,period.year,period.month)) throw new Error('Employee was terminated before this payroll month');
    const records = await Attendance.find({employeeId:emp._id,date:{$regex:'^'+period.key}});
    const breakdown = calculateSalary(emp.salary,records,period.year,period.month,emp);
    const updated = await Payroll.findOneAndUpdate({_id:record._id,status:record.status,updatedAt:record.updatedAt},{$set:{salary:breakdown.finalSalary,salaryBreakdown:breakdown,calculationSource:'attendance',calculationVersion:2},$push:{auditHistory:auditEntry(req.user,'recalculated',{salary:record.salary},{salary:breakdown.finalSalary},'Attendance recalculated')}},{new:true,runValidators:true});
    if(!updated) return res.status(409).json({error:'Payroll changed. Refresh and try again.'});
    res.json(updated);
  } catch(error) { fail(res,error); }
});
router.put('/:id', async (req,res) => {
  try {
    const record = await Payroll.findById(req.params.id);
    if (!record) return res.sendStatus(404);
    if (['Paid','Voided'].includes(record.status)) return res.status(409).json({error:'Paid payroll is locked to preserve Accounts and its payslip.'});
    const allowed = ['paidBy','paymentMethod','accountNumber','chequeNumber','salary','status','reason','paymentDate','payrollMonth','branch','employee','_id','createdAt','updatedAt','__v','employeeId','payrollKey','calculationSource','calculationVersion','salaryBreakdown','auditHistory'];
    if(Object.keys(req.body).some(key=>!allowed.includes(key))) throw new Error('Unsupported payroll field');
    for (const key of ['employee','branch','payrollMonth']) if (req.body[key] != null && String(req.body[key]).slice(0,key === 'payrollMonth' ? 7 : undefined) !== String(record[key]).slice(0,key === 'payrollMonth' ? 7 : undefined)) throw new Error('Payroll identity cannot be changed. Create the correct payroll instead.');
    const salary = req.body.salary == null ? record.salary : validatePayrollAmount(req.body.salary);
    if (record.calculationSource === 'attendance' && salary !== record.salary) throw new Error('Recalculate attendance-based payroll instead of editing its salary');
    if (salary !== record.salary && !String(req.body.reason || '').trim()) throw new Error('Provide a reason for changing salary');
    const status = req.body.status ?? record.status;
    if (!['Unpaid','Pending','Paid'].includes(status)) throw new Error('Invalid payment status');
    const change = {salary,status};
    for(const key of ['paymentMethod','accountNumber','chequeNumber']) if(req.body[key] != null) change[key] = String(req.body[key]).slice(0,200);
    if(status === 'Paid') { change.paidBy = req.user.email || req.user.name; change.paymentDate = new Date(); }
    const updated = await Payroll.findOneAndUpdate({_id:record._id,status:record.status,updatedAt:record.updatedAt},{$set:change,$push:{auditHistory:auditEntry(req.user,status === 'Paid' ? 'paid' : 'updated',{salary:record.salary,status:record.status},change,req.body.reason || 'Payment details updated')}},{new:true,runValidators:true});
    if(!updated) return res.status(409).json({error:'Payroll changed. Refresh and try again.'});
    res.json(updated);
  } catch(error) { fail(res,error); }
});
router.delete('/:id', async (req,res) => {
  try {
    const record = await Payroll.findById(req.params.id);
    if(!record) return res.sendStatus(404);
    if(['Paid','Voided'].includes(record.status)) return res.status(409).json({error:'Paid payroll cannot be deleted'});
    const updated = await Payroll.findOneAndUpdate({_id:record._id,status:record.status,updatedAt:record.updatedAt},{$set:{status:'Voided'},$unset:{payrollKey:1},$push:{auditHistory:auditEntry(req.user,'voided',{salary:record.salary,status:record.status},{status:'Voided'},'Unpaid payroll cancelled')}},{new:true,runValidators:true});
    if(!updated) return res.status(409).json({error:'Payroll changed. Refresh and try again.'});
    res.json({success:true,payroll:updated});
  } catch(error) { fail(res,error); }
});
router.get('/:id', async (req,res) => { try { const row=await Payroll.findById(req.params.id); if(!row)return res.sendStatus(404); res.json(row); } catch(error){fail(res,error);} });
export default router;
