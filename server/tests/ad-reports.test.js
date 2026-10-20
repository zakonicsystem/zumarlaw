import test from 'node:test';
import assert from 'node:assert/strict';
import { periodRange } from '../utils/adReportRules.js';
import Report from '../models/DailyAdReport.js';
import Ticket from '../models/SupportTicket.js';
import express from 'express';
import router from '../routes/adReports.js';
import { createAdReportPdf } from '../utils/adReportPdf.js';
test('individual PDF fits ordinary reports on one page and embeds the logo', async () => {
  const doc = createAdReportPdf({ individual: true, range: { start: '2026-10-19', end: '2026-10-19' }, reports: [{ employeeName: 'Arsa Ahmed', designation: 'PRD', employeePhone: '03001234567', dealingService: 'Trademark Registration', reportDate: '2026-10-19', employeeSignature: 'Arsa Ahmed', fakeComments: 'Duplicate or unrelated enquiries.', followUpComments: 'Contact interested clients tomorrow.', convertedClientName: 'Example Client', remark: 'Reviewed and approved.' }] });
  assert.equal(doc.bufferedPageRange().count, 1);
  const buffers = []; doc.on('data', chunk => buffers.push(chunk));
  const finished = new Promise(resolve => doc.on('end', resolve)); doc.end(); await finished;
  assert.ok(Buffer.concat(buffers).toString('latin1').includes('/Subtype /Image'));
});
test('long report comments continue on additional pages', () => {
  const doc = createAdReportPdf({ individual: true, range: {}, reports: [{ fakeComments: 'Long comment '.repeat(330), followUpComments: 'Follow up '.repeat(390), remark: 'Remark '.repeat(600) }] });
  assert.ok(doc.bufferedPageRange().count > 1); doc.resume(); doc.end();
});
test('weekly reports cover Monday to Sunday across months', () => {
  assert.deepEqual(periodRange('weekly', '2026-11-01'), { start: '2026-10-26', end: '2026-11-01' });
});
test('monthly reports handle leap years and December', () => {
  assert.deepEqual(periodRange('monthly', '2024-02-10'), { start: '2024-02-01', end: '2024-02-29' });
  assert.deepEqual(periodRange('monthly', '2026-12-20'), { start: '2026-12-01', end: '2026-12-31' });
});
test('invalid dates and periods are rejected', () => {
  for (const date of ['2026-02-30', 'bad', '2026-13-01']) assert.throws(() => periodRange('daily', date));
  assert.throws(() => periodRange('yearly', '2026-01-01'));
});
test('daily report requires ownership and signature and rejects negative counts', () => {
  const errors = new Report({ reportDate: '2026-10-17', dealingService: 'Trademark', totalLeads: -1 }).validateSync().errors;
  assert.ok(errors.employee); assert.ok(errors.employeeSignature); assert.ok(errors.totalLeads);
});
test('ticket rejects invalid status and requires client ownership', () => {
  const errors = new Ticket({ reference: 'TEST', subject: 'Issue', description: 'Details', status: 'invalid' }).validateSync().errors;
  assert.ok(errors.client); assert.ok(errors.status);
});
test('PDF export enforces employee ownership and produces a PDF', async () => {
  const original = Report.find;
  let captured;
  Report.find = filter => { captured = filter; return { sort: () => ({ lean: async () => [{ _id: '507f1f77bcf86cd799439011', employeeName: 'Test employee', designation: 'PRD', employeePhone: '03001234567', reportDate: '2026-10-17', dealingService: 'Trademark Registration', employeeSignature: 'Test employee', ...Object.fromEntries(['totalLeads', 'fakeLeads', 'noResponseLeads', 'interestedLeads', 'matureLeads', 'previousMatureLeads', 'followUpLeads', 'convertedNew', 'convertedOld'].map(k => [k, 1])) }] }) }; };
  const app = express();
  app.use((req, res, next) => { req.user = { role: 'employee', id: '507f1f77bcf86cd799439022' }; next(); });
  app.use(router);
  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise(resolve => server.once('listening', resolve));
    const response = await fetch(`http://127.0.0.1:${server.address().port}/pdf?period=daily&date=2026-10-17&employee=507f1f77bcf86cd799439033&service=Trademark%20Registration&review=pending&search=Client%2B`);
    assert.equal(response.status, 200);
    assert.equal(captured.employee, '507f1f77bcf86cd799439022');
    assert.equal(captured.dealingService, 'Trademark Registration');
    assert.equal(captured.$and[0].$or[0].reviewStatus, 'pending');
    assert.equal(captured.$or[0].employeeName.$regex, 'Client\\+');
    assert.equal(response.headers.get('content-type'), 'application/pdf');
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(bytes.subarray(0, 4).toString(), '%PDF');
    assert.ok(bytes.length > 2000);
  } finally { Report.find = original; await new Promise(resolve => server.close(resolve)); }
});
