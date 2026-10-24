import test from 'node:test';
import assert from 'node:assert/strict';
import { createConvertedLead } from '../controllers/convertedLeadController.js';
import ConvertedLead from '../models/ConvertedLead.js';
import Job from '../models/NotificationJob.js';

const create = async (body) => {
  const res = { code: 200, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } };
  await createConvertedLead({ user: { role: 'admin' }, body: { name: 'Invoice Test', email: 'invoice@example.test', phone: '03001234567', service: 'Trademark Registration', totalPayment: 1000, paymentMethod: 'Cash', ...body } }, res);
  return res;
};
test('zero or absent advance queues an unpaid invoice email without recording a payment', async t => {
  t.mock.method(console, 'log', () => {});
  t.mock.method(ConvertedLead.prototype, 'save', async function () { await this.validate(); return this; });
  const jobs = [];
  t.mock.method(Job, 'findOneAndUpdate', async (filter, update) => { jobs.push(update.$setOnInsert); });
  for (const body of [{ currentReceivingPayment: 0 }, { currentReceivingPayment: '0' }, { advancePayment: '0' }, { pricing: { currentReceivingPayment: 0 } }, { 'pricing.currentReceivingPayment': '0' }, {}, { currentReceivingPayment: 0, remainingAmount: 0 }]) {
    jobs.length = 0;
    const response = await create(body);
    assert.equal(response.code, 201);
    assert.equal(response.data.lead.payments.length, 0);
    assert.equal(response.data.lead.pricing.currentReceivingPayment, 0);
    assert.equal(response.data.lead.pricing.remainingAmount, 1000);
    assert.equal(jobs.length, 1); assert.equal(jobs[0].channel, 'email');
    assert.equal(jobs[0].recipient, 'invoice@example.test');
    assert.match(jobs[0].payload.text, /Paid Amount: Rs\. 0/);
    assert.match(jobs[0].payload.text, /Remaining Amount: Rs\. 1,000/);
    assert.match(jobs[0].payload.text, /Payment Status: Payment Pending/);
    assert.doesNotMatch(jobs[0].payload.text, /successfully received/);
  }
});
test('positive advances retain payment notifications and payment records', async t => {
  t.mock.method(console, 'log', () => {});
  t.mock.method(ConvertedLead.prototype, 'save', async function () { await this.validate(); return this; });
  const jobs = [];
  t.mock.method(Job, 'findOneAndUpdate', async (filter, update) => { jobs.push(update.$setOnInsert); });
  for (const body of [{ currentReceivingPayment: 250 }, { advancePayment: 250 }]) {
    jobs.length = 0;
    const response = await create(body);
    assert.equal(response.code, 201); assert.equal(response.data.lead.payments[0].amount, 250);
    assert.deepEqual(jobs.map(job => job.channel).sort(), ['email', 'inapp', 'sms']);
    assert.match(jobs.find(job => job.channel === 'email').payload.text, /Paid Amount: Rs\. 250/);
    assert.match(jobs.find(job => job.channel === 'email').payload.text, /Remaining Amount: Rs\. 750/);
  }
});
test('invalid advances do not queue invoices', async t => {
  t.mock.method(console, 'log', () => {});
  t.mock.method(Job, 'findOneAndUpdate', async () => { assert.fail('Invalid payment must not notify'); });
  for (const amount of [-1, 'not-a-number']) assert.equal((await create({ currentReceivingPayment: amount })).code, 400);
});
