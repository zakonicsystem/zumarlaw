import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import adminRouter from '../routes/admin.js';
import { apiAccess } from '../middleware/apiAccess.js';
import User from '../models/User.js';
test('complaint lookup uses Customer API shape, loads defaults, and permits staff without opening other customer APIs', async t => {
  let captured;
  t.mock.method(User, 'find', filter => { captured = filter; return { select: fields => {
    assert.equal(fields, 'firstName lastName email phoneNumber cnic');
    return { sort: () => ({ limit: limit => { assert.equal(limit, 50); return { lean: async () => [{ _id: 'customer-id', firstName: 'Test', lastName: 'Customer', email: 'customer@example.test', phoneNumber: '03001234567', cnic: '1234512345671', password: 'must-not-leak' }] }; } }) };
  } }; });
  const app = express();
  app.use((req, res, next) => { req.authVerified = true; req.user = { role: req.headers['x-test-role'] || 'employee', assignedPages: [] }; next(); });
  app.use('/api', apiAccess); app.use('/api/admin', adminRouter);
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api/admin/customers`;
  const defaults = await fetch(`${base}?lookup=complaint`); assert.equal(defaults.status, 200);
  assert.deepEqual(await defaults.json(), [{ _id: 'customer-id', name: 'Test Customer', email: 'customer@example.test', phone: '03001234567', cnic: '1234512345671' }]);
  assert.deepEqual(captured.isActive, { $ne: false }); assert.deepEqual(captured.isAdmin, { $ne: true });
  assert.equal(captured.$and, undefined);
  assert.equal((await fetch(`${base}?lookup=complaint&search=Test%20Customer%2B`)).status, 200);
  assert.equal(captured.$and.length, 2); assert.equal(captured.$and[1].$or[0].firstName.$regex, 'Customer\\+');
  assert.equal((await fetch(`${base}?lookup=complaint`, { headers: { 'x-test-role': 'user' } })).status, 403);
  assert.equal((await fetch(base)).status, 403);
});
