import test from 'node:test';
import assert from 'node:assert/strict';
import router from '../routes/adReports.js';
import Report, { metrics } from '../models/DailyAdReport.js';
import { reportStatus } from '../utils/reportReview.js';
const id = '507f1f77bcf86cd799439011', employeeId = '507f1f77bcf86cd799439022';
const values = { reportDate: '2026-10-17', dealingService: 'Trademark Registration', employeeSignature: 'Test Employee', fakeComments: '', followUpComments: '', convertedClientName: '', ...Object.fromEntries(metrics.map(key => [key, 1])) };
const invoke = async (path, user, body) => {
  const res = { code: 200, set() { return this; }, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } };
  await router.stack.find(layer => layer.route?.path === path).route.stack[0].handle({ user, body, params: { id } }, res);
  return res;
};
test('reports can repeat objection and correction cycles until approval, then lock', async t => {
  let current = { _id: id, employee: employeeId, reportDate: '2026-10-19', dealingService: 'Trademark Registration', ...values, revision: 0, reviewStatus: 'pending', reviewHistory: [] };
  t.mock.method(Report, 'countDocuments', async filter => {
    assert.deepEqual(filter, { employee: employeeId, reviewStatus: 'objected' });
    return current.reviewStatus === 'objected' ? 1 : 0;
  });
  t.mock.method(Report, 'findById', () => ({ lean: async () => structuredClone(current) }));
  t.mock.method(Report, 'findOne', filter => ({ lean: async () => String(filter.employee) === employeeId ? structuredClone(current) : null }));
  t.mock.method(Report, 'findOneAndUpdate', async (filter, update) => {
    assert.equal(filter.reviewStatus, current.reviewStatus);
    if (filter.employee) assert.equal(String(filter.employee), employeeId);
    if (filter.revision !== undefined) assert.equal(filter.revision, current.revision);
    current = { ...current, ...update.$set, revision: current.revision + 1, reviewHistory: [...current.reviewHistory, update.$push.reviewHistory] };
    return structuredClone(current);
  });
  const admin = { role: 'admin', id: 'supervisor' }, employee = { role: 'employee', id: employeeId, name: 'Test Employee' };
  for (let cycle = 0; cycle < 3; cycle++) {
    const review = await invoke('/:id/review', admin, { decision: 'object', revision: current.revision, supervisorName: 'Supervisor', supervisorSignature: 'Supervisor', remark: `Correct the lead count, round ${cycle + 1}` });
    assert.equal(review.code, 200); assert.equal(current.reviewStatus, 'objected');
    assert.equal((await invoke('/objections-summary', employee, {})).data.count, 1);
    assert.equal((await invoke('/objections-summary', employee, {})).data.count, 1);
    const stale = await invoke('/:id/resubmit', employee, { ...values, revision: current.revision - 1, correctionRemark: 'Corrected' });
    assert.equal(stale.code, 409);
    const corrected = await invoke('/:id/resubmit', employee, { ...values, totalLeads: 10 + cycle, revision: current.revision, correctionRemark: `Corrected round ${cycle + 1}`, reviewStatus: 'approved', employee: 'someone-else' });
    assert.equal(corrected.code, 200); assert.equal(current.reviewStatus, 'resubmitted'); assert.equal(current.employee, employeeId);
    assert.equal((await invoke('/objections-summary', employee, {})).data.count, 0);
  }
  assert.equal(current.reviewHistory.length, 6);
  assert.equal(current.reviewHistory[1].snapshot.totalLeads, 10);
  assert.equal((await invoke('/objections-summary', admin, {})).code, 403);
  const approved = await invoke('/:id/review', admin, { decision: 'approve', revision: current.revision, supervisorName: 'Supervisor', supervisorSignature: 'Supervisor', remark: 'All corrections verified' });
  assert.equal(approved.code, 200); assert.equal(current.reviewStatus, 'approved'); assert.equal(current.reviewHistory.length, 7);
  assert.equal((await invoke('/:id/resubmit', employee, { ...values, revision: current.revision, correctionRemark: 'Try editing approved report' })).code, 409);
  assert.equal((await invoke('/:id/review', admin, { decision: 'object', revision: current.revision, supervisorName: 'Supervisor', supervisorSignature: 'Supervisor', remark: 'Try editing approved' })).code, 409);
});
test('report correction enforces employee ownership and supervisor-only approval', async t => {
  t.mock.method(Report, 'findOne', () => ({ lean: async () => null }));
  assert.equal((await invoke('/:id/resubmit', { role: 'employee', id: 'other-employee' }, { ...values, revision: 1, correctionRemark: 'Correction' })).code, 404);
  assert.equal((await invoke('/:id/review', { role: 'employee', id: employeeId }, { decision: 'approve' })).code, 403);
  assert.equal(reportStatus({ reviewedAt: new Date() }), 'approved');
  assert.equal(reportStatus({}), 'pending');
});
test('a duplicate date/service correction returns a useful conflict', async t => {
  t.mock.method(Report, 'findOne', () => ({ lean: async () => ({ _id: id, employee: employeeId, reviewStatus: 'objected', revision: 1 }) }));
  t.mock.method(Report, 'findOneAndUpdate', async () => { throw Object.assign(new Error('duplicate'), { code: 11000 }); });
  const response = await invoke('/:id/resubmit', { role: 'employee', id: employeeId }, { ...values, revision: 1, correctionRemark: 'Corrected date and service' });
  assert.equal(response.code, 409); assert.match(response.data.message, /already have a report/);
});
test('open objections view includes older reports and remains scoped to the employee', async t => {
  let captured;
  t.mock.method(Report, 'find', filter => { captured = filter; return { sort: () => ({ lean: async () => [{ _id: id, employee: employeeId, reportDate: '2026-01-01', reviewStatus: 'objected', ...Object.fromEntries(metrics.map(key => [key, 1])) }] }) }; });
  const res = { status() { return this; }, json(data) { this.data = data; return this; } };
  const handler = router.stack.find(layer => layer.route?.path === '/' && layer.route.methods.get).route.stack[0].handle;
  await handler({ user: { role: 'employee', id: employeeId }, query: { period: 'objections', date: '2026-10-20', employee: '507f1f77bcf86cd799439099' } }, res);
  assert.equal(captured.reportDate, undefined); assert.equal(captured.reviewStatus, 'objected'); assert.equal(captured.employee, employeeId);
  assert.equal(res.data.reports[0].reportDate, '2026-01-01');
});
