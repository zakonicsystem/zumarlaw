import test from 'node:test';
import assert from 'node:assert/strict';
import router from '../routes/supportTickets.js';
import Ticket from '../models/SupportTicket.js';
import Job from '../models/NotificationJob.js';
import { normalizeTicketStatus } from '../utils/ticketRules.js';
import { buildTicketEmail } from '../utils/ticketEmail.js';
import { ticketSubmitter } from '../../client/src/utils/ticketSubmitter.js';
test('submitter labels show Admin, employee name, or client name', () => {
  assert.deepEqual(ticketSubmitter({ createdByRole: 'admin', createdByName: 'Internal admin', name: 'Complaint Person' }), { name: 'Admin', role: 'Administrator' });
  assert.deepEqual(ticketSubmitter({ createdByRole: 'employee', createdByName: 'Test Employee', name: 'Complaint Person' }), { name: 'Test Employee', role: 'Employee' });
  assert.deepEqual(ticketSubmitter({ createdByRole: 'user', createdByName: 'Test Client', name: 'Complaint Person' }), { name: 'Test Client', role: 'Client' });
  assert.equal(ticketSubmitter({ name: 'Legacy Client' }).name, 'Legacy Client');
});
test('ticket emails escape client content and include status, logo, contact and plain text', () => {
  const ticket = { name: '<script>alert(1)</script>', subject: '<img src=x>', reference: 'ZLF-TEST', description: 'First line\nSecond line', resolution: '<b>Fixed</b>\nDetails', status: 'resolved' };
  const received = buildTicketEmail(ticket, 'created');
  const resolved = buildTicketEmail(ticket, 'resolved');
  assert.match(received.html, /cid:zumar-law-firm-logo/);
  assert.match(received.html, /PENDING REVIEW/);
  assert.match(received.html, /First line<br>Second line/);
  assert.match(received.html, /&lt;script&gt;/);
  assert.doesNotMatch(received.html, /<script>|<img src=x>/);
  assert.match(resolved.html, /RESOLVED/);
  assert.match(resolved.html, /&lt;b&gt;Fixed&lt;\/b&gt;<br>Details/);
  assert.match(resolved.text, /Resolution:\n<b>Fixed<\/b>/);
  for (const email of [received, resolved]) {
    assert.match(email.text, /051-8445095/); assert.match(email.html, /team@zumarlawfirm.com/);
    assert.equal(email.replyTo, 'team@zumarlawfirm.com');
    assert.match(email.subject, /ZLF-TEST/);
  }
  assert.match(buildTicketEmail({ ...ticket, status: 'completed' }, 'resolved').html, /COMPLETED/);
});
const invoke = async (path, method, req) => {
  const res = { code: 200, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } };
  await router.stack.find(l => l.route?.path === path && l.route.methods[method]).route.stack[0].handle(req, res);
  return res;
};
const user = { role: 'user', id: '507f1f77bcf86cd799439011', name: 'Test Client' };
const body = { category: 'Employee Behaviour', name: 'Test Client', cnic: '12345-1234567-1', description: 'Please review this issue.', email: 'client@example.test', phone: '03001234567' };
test('predefined subjects are stored from the selected category and notify both channels', async t => {
  let saved; const jobs = [];
  t.mock.method(Ticket, 'create', async data => { saved = data; return { ...data, id: 'ticket-test' }; });
  t.mock.method(Job, 'findOneAndUpdate', async (filter, update) => { jobs.push(update.$setOnInsert); });
  const res = await invoke('/', 'post', { user, body: { ...body, subject: 'Untrusted override' } });
  assert.equal(res.code, 201); assert.equal(saved.subject, 'Employee Behaviour');
  assert.equal(saved.client, user.id); assert.deepEqual(jobs.map(j => j.channel).sort(), ['email', 'sms']);
  assert.match(jobs.find(j => j.channel === 'email').payload.html, /Your ticket is in good hands/);
});
test('Other requires a custom nonempty subject and invalid categories are rejected', async () => {
  for (const change of [{ category: 'Other', subject: ' ' }, { category: 'Invalid' }]) {
    const res = await invoke('/', 'post', { user, body: { ...body, ...change } }); assert.equal(res.code, 400);
  }
});
test('completion requires resolution and non-admin users cannot change status', async () => {
  assert.equal((await invoke('/:id', 'patch', { user, params: { id: user.id }, body: { status: 'pending' } })).code, 403);
  assert.equal((await invoke('/:id', 'patch', { user: { role: 'admin' }, params: { id: user.id }, body: { status: 'completed' } })).code, 400);
});
test('completed tickets save resolution and queue both delivery channels', async t => {
  let saved; const jobs = [];
  t.mock.method(Ticket, 'findOneAndUpdate', async (filter, update) => { saved = update.$set; assert.deepEqual(filter.status.$nin, ['resolved', 'completed']); return { id: 'ticket-test', ...body, ...saved }; });
  t.mock.method(Job, 'findOneAndUpdate', async (filter, update) => { jobs.push(update.$setOnInsert); });
  const res = await invoke('/:id', 'patch', { user: { role: 'admin', id: user.id }, params: { id: user.id }, body: { status: 'completed', resolution: 'Issue handled.' } });
  assert.equal(res.code, 200); assert.equal(saved.status, 'completed'); assert.equal(saved.resolution, 'Issue handled.'); assert.equal(jobs.length, 2);
  assert.match(jobs.find(j => j.channel === 'email').payload.html, /Issue handled/);
});
test('legacy statuses map to the new labels', () => {
  assert.equal(normalizeTicketStatus('open'), 'pending'); assert.equal(normalizeTicketStatus('in_progress'), 'under_review');
});
