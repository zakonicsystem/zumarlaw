import express from 'express';
import { createAdReportPdf } from '../utils/adReportPdf.js';
import Report, { metrics } from '../models/DailyAdReport.js';
import Roles from '../models/Roles.js';
import { servicePrices } from '../data/servicePrices.js';
import { periodRange } from '../utils/adReportRules.js';
import { reportStatus, revisionQuery, reportValues, reportSnapshot } from '../utils/reportReview.js';
const router = express.Router();
router.use((req, res, next) => ['admin', 'employee'].includes(req.user.role) ? next() : res.status(403).json({ message: 'Staff access required' }));
router.get('/objections-summary', async (req, res) => {
  if (req.user.role !== 'employee') return res.status(403).json({ message: 'Employee access required' });
  const count = await Report.countDocuments({ employee: req.user.id, reviewStatus: 'objected' });
  res.set('Cache-Control', 'private, no-store');
  res.json({ count });
});
router.get('/options', async (req, res) => {
  const employee = req.user.role === 'employee' ? await Roles.findById(req.user.id).select('name role phone').lean() : null;
  res.json({ services: Object.keys(servicePrices), employee, employees: req.user.role === 'admin' ? await Roles.find().select('name').sort({ name: 1 }).lean() : [] });
});
async function queryReports(req) {
  const objectionsOnly = req.query.period === 'objections';
  const range = objectionsOnly ? { start: 'All dates', end: 'Open objections' } : periodRange(req.query.period, req.query.date);
  const filter = objectionsOnly ? { reviewStatus: 'objected' } : { reportDate: { $gte: range.start, $lte: range.end } };
  if (req.query.service) {
    if (typeof req.query.service !== 'string' || req.query.service.length > 200) throw new Error('Invalid service filter');
    filter.dealingService = req.query.service;
  }
  if (req.query.review) {
    const status = req.query.review === 'reviewed' ? 'approved' : req.query.review;
    if (!['pending', 'approved', 'objected', 'resubmitted'].includes(status)) throw new Error('Invalid review filter');
    filter.$and = [{ $or: [{ reviewStatus: status }, ...(status === 'pending' ? [{ reviewStatus: { $exists: false }, reviewedAt: null }] : status === 'approved' ? [{ reviewStatus: { $exists: false }, reviewedAt: { $ne: null } }] : [])] }];
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
  const reports = (await Report.find(filter).sort({ reportDate: -1, employeeName: 1 }).lean()).map(r => ({ ...r, reviewStatus: reportStatus(r), revision: r.revision || 0 }));
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
  const { decision, revision, supervisorName, supervisorSignature, remark } = req.body;
  if (!/^[a-f0-9]{24}$/i.test(req.params.id) || !['approve', 'object'].includes(decision) || !Number.isSafeInteger(revision) || revision < 0 ||
    ![supervisorName, supervisorSignature, remark].every((v, i) => typeof v === 'string' && v.trim() && v.length <= (i === 2 ? 4000 : 160))) return res.status(400).json({ message: 'Decision, report revision, supervisor name, signature and remark are required' });
  const current = await Report.findById(req.params.id).lean();
  if (!current) return res.status(404).json({ message: 'Report not found' });
  if (!['pending', 'resubmitted'].includes(reportStatus(current)) || (current.revision || 0) !== revision) return res.status(409).json({ message: 'This report changed or is not awaiting review. Refresh the report.' });
  const nextStatus = decision === 'object' ? 'objected' : 'approved';
  const report = await Report.findOneAndUpdate({ _id: current._id, ...revisionQuery(revision), ...(current.reviewStatus ? { reviewStatus: current.reviewStatus } : { reviewStatus: { $exists: false } }) }, {
    $set: { reviewStatus: nextStatus, supervisorName: supervisorName.trim(), supervisorSignature: supervisorSignature.trim(), remark: remark.trim(),
      objectionRemark: decision === 'object' ? remark.trim() : '', reviewedAt: new Date() },
    $inc: { revision: 1 }, $push: { reviewHistory: { action: nextStatus, actor: String(req.user.id), actorName: supervisorName.trim(), remark: remark.trim(), revision, at: new Date(), snapshot: reportSnapshot(current) } },
  }, { new: true, runValidators: true });
  if (!report) return res.status(409).json({ message: 'Report changed. Refresh before reviewing.' });
  res.json(report);
});
router.patch('/:id/resubmit', async (req, res) => {
  if (req.user.role !== 'employee') return res.status(403).json({ message: 'Only the report owner can submit corrections' });
  if (!/^[a-f0-9]{24}$/i.test(req.params.id)) return res.status(400).json({ message: 'Invalid report' });
  const { revision, correctionRemark } = req.body;
  let values;
  try {
    values = reportValues(req.body);
    if (typeof req.body.reportDate !== 'string') throw new Error('Enter a valid report date');
    periodRange('daily', req.body.reportDate);
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });
    if (req.body.reportDate > today || !Object.hasOwn(servicePrices, req.body.dealingService)) throw new Error('Check the report date and dealing service');
    values = { ...values, reportDate: req.body.reportDate, dealingService: req.body.dealingService };
    if (!Number.isSafeInteger(revision) || revision < 0 || typeof correctionRemark !== 'string' || !correctionRemark.trim() || correctionRemark.length > 4000) throw new Error('Enter a correction note and valid report revision');
  } catch (error) { return res.status(400).json({ message: error.message }); }
  const current = await Report.findOne({ _id: req.params.id, employee: req.user.id }).lean();
  if (!current) return res.status(404).json({ message: 'Report not found' });
  if (reportStatus(current) !== 'objected' || (current.revision || 0) !== revision) return res.status(409).json({ message: 'Only a report with an open objection can be corrected. Refresh the report.' });
  let report;
  try { report = await Report.findOneAndUpdate({ _id: current._id, employee: req.user.id, reviewStatus: 'objected', ...revisionQuery(revision) }, {
    $set: { ...values, reviewStatus: 'resubmitted', correctionRemark: correctionRemark.trim() }, $inc: { revision: 1 },
    $push: { reviewHistory: { action: 'resubmitted', actor: String(req.user.id), actorName: req.user.name, remark: correctionRemark.trim(), revision: revision + 1, at: new Date(), snapshot: reportSnapshot({ ...current, ...values }) } },
  }, { new: true, runValidators: true }); } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'You already have a report for this date and service. Choose a different date or service.' });
    throw error;
  }
  if (!report) return res.status(409).json({ message: 'Report changed. Refresh before resubmitting.' });
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
