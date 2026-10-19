import express from 'express';
import { createAdReportPdf } from '../utils/adReportPdf.js';
import Report, { metrics } from '../models/DailyAdReport.js';
import Roles from '../models/Roles.js';
import { servicePrices } from '../data/servicePrices.js';
import { periodRange } from '../utils/adReportRules.js';
const router = express.Router();
router.use((req, res, next) => ['admin', 'employee'].includes(req.user.role) ? next() : res.status(403).json({ message: 'Staff access required' }));
router.get('/options', async (req, res) => {
  const employee = req.user.role === 'employee' ? await Roles.findById(req.user.id).select('name role phone').lean() : null;
  res.json({ services: Object.keys(servicePrices), employee, employees: req.user.role === 'admin' ? await Roles.find().select('name').sort({ name: 1 }).lean() : [] });
});
async function queryReports(req) {
  const range = periodRange(req.query.period, req.query.date);
  const filter = { reportDate: { $gte: range.start, $lte: range.end } };
  if (req.query.service) {
    if (typeof req.query.service !== 'string' || req.query.service.length > 200) throw new Error('Invalid service filter');
    filter.dealingService = req.query.service;
  }
  if (req.query.review) {
    if (!['pending', 'reviewed'].includes(req.query.review)) throw new Error('Invalid review filter');
    filter.reviewedAt = req.query.review === 'reviewed' ? { $ne: null } : null;
  }
  if (req.query.search) {
    if (typeof req.query.search !== 'string' || req.query.search.length > 120) throw new Error('Search must be 120 characters or fewer');
    const search = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = ['employeeName', 'dealingService', 'convertedClientName'].map(key => ({ [key]: { $regex: search, $options: 'i' } }));
  }
  if (req.user.role === 'employee') filter.employee = req.user.id;
  else if (req.query.employee) {
    if (!/^[a-f0-9]{24}$/i.test(req.query.employee)) throw new Error('Invalid employee');
    filter.employee = req.query.employee;
  }
  const reports = await Report.find(filter).sort({ reportDate: -1, employeeName: 1 }).lean();
  return { range, reports, totals: Object.fromEntries(metrics.map(k => [k, reports.reduce((sum, r) => sum + r[k], 0)])) };
}
router.get('/', async (req, res) => {
  try { res.json(await queryReports(req)); } catch (e) { res.status(400).json({ message: e.message }); }
});
router.post('/', async (req, res) => {
  if (req.user.role !== 'employee') return res.status(403).json({ message: 'Employees submit their own reports' });
  const body = req.body;
  try { if (typeof body.reportDate !== 'string') throw new Error(); periodRange('daily', body.reportDate); } catch { return res.status(400).json({ message: 'A valid report date is required' }); }
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });
  if (body.reportDate > today || !Object.hasOwn(servicePrices, body.dealingService) || typeof body.employeeSignature !== 'string' || !body.employeeSignature.trim() || body.employeeSignature.length > 160 || metrics.some(k => !Number.isSafeInteger(body[k]) || body[k] < 0 || body[k] > 1000000)) return res.status(400).json({ message: 'Check the date, service, signature and non-negative whole-number lead counts' });
  for (const k of ['fakeComments', 'followUpComments', 'convertedClientName']) if (typeof body[k] !== 'string' || body[k].length > (k === 'convertedClientName' ? 2000 : 4000)) return res.status(400).json({ message: 'Comments or client names are invalid or too long' });
  const employee = await Roles.findById(req.user.id);
  try {
    const report = await Report.create({ employee: employee.id, employeeName: employee.name, designation: employee.role, employeePhone: employee.phone, reportDate: body.reportDate, dealingService: body.dealingService, employeeSignature: body.employeeSignature.trim(), ...Object.fromEntries([...metrics, 'fakeComments', 'followUpComments', 'convertedClientName'].map(k => [k, body[k]])) });
    res.status(201).json(report);
  } catch (e) { if (e.code === 11000) return res.status(409).json({ message: 'A report for this date and service has already been submitted' }); throw e; }
});
router.patch('/:id/review', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Administrator access required' });
  if (!/^[a-f0-9]{24}$/i.test(req.params.id) || !['supervisorName', 'supervisorSignature', 'remark'].every(k => typeof req.body[k] === 'string' && req.body[k].trim() && req.body[k].length <= (k === 'remark' ? 4000 : 160))) return res.status(400).json({ message: 'Supervisor name, signature and remark are required' });
  const report = await Report.findByIdAndUpdate(req.params.id, { $set: { supervisorName: req.body.supervisorName, supervisorSignature: req.body.supervisorSignature, remark: req.body.remark, reviewedAt: new Date() } }, { new: true, runValidators: true });
  if (!report) return res.status(404).json({ message: 'Report not found' });
  res.json(report);
});
router.get('/pdf', async (req, res) => {
  let data;
  try { data = await queryReports(req); } catch (e) { return res.status(400).json({ message: e.message }); }
  if (req.query.id) data.reports = data.reports.filter(r => String(r._id) === req.query.id);
  if (!data.reports.length) return res.status(404).json({ message: 'No reports found for this selection' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="employee-reports-${data.range.start}.pdf"`);
  const doc = createAdReportPdf({ ...data, period: req.query.period || 'daily', individual: Boolean(req.query.id) });
  doc.pipe(res);
  doc.end();
});
export default router;
