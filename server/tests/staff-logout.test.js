import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { apiAccess } from '../middleware/apiAccess.js';
import adminRouter from '../routes/admin.js';
import { logoutStaff } from '../../client/src/utils/staffLogout.js';
test('staff logout clears local credentials on success, expired session, and unavailable server', async () => {
  for (const error of [null, new Error('403'), new Error('Network unavailable')]) {
    const values = new Map(['adminToken', 'employeeToken', 'isSuperAdmin', 'employeeName', 'assignedPages'].map(key => [key, 'test']));
    let route, options;
    await logoutStaff({ request: async () => { if (error) throw error; }, storage: { removeItem: key => values.delete(key) }, redirect: (path, config) => { route = path; options = config; }, isEmployee: true });
    assert.equal(values.size, 0); assert.equal(route, '/admin/employee-login'); assert.equal(options.replace, true);
  }
});
test('employee logout is allowed and clears private-file cookies without granting other admin APIs', async t => {
  const app = express();
  app.use((req, res, next) => { req.authVerified = true; req.user = { role: req.headers['x-test-role'] || 'employee', assignedPages: [] }; next(); });
  app.use('/api', apiAccess); app.use('/api/admin', adminRouter);
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api/admin`;
  const response = await fetch(base + '/logout'); assert.equal(response.status, 200);
  assert.match(response.headers.get('set-cookie'), /portal_files=; Path=\/uploads/);
  assert.equal((await fetch(base + '/logout', { headers: { 'x-test-role': 'admin' } })).status, 200);
  assert.equal((await fetch(base + '/logout', { headers: { 'x-test-role': 'user' } })).status, 403);
  assert.equal((await fetch(base + '/customers')).status, 403);
});
