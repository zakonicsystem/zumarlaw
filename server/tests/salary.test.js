import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calculateSalary } from '../utils/calculateSalary.js';
import { salarySlipTotals } from '../../client/src/utils/salarySlip.js';

const fullMonth = (year, month) => Array.from({ length: new Date(year, month, 0).getDate() }, (_, i) => ({
  date: [year, String(month).padStart(2, '0'), String(i + 1).padStart(2, '0')].join('-'), present: true
}));
const source = readFileSync(new URL('../../client/src/pages/admin/Salary.jsx', import.meta.url), 'utf8');
const fallbackBody = source.slice(source.indexOf('          const compute = (emp) => {'), source.indexOf('          data = employees.map(compute);'));
const fallback = new Function('emp', 'attendance', 'year', 'month', fallbackBody + '; return compute(emp);');

for (const [year, month] of [[2026, 2], [2024, 2], [2026, 4], [2026, 7]]) {
  test('half-day pays 500 at a 1000 daily rate: ' + year + '-' + month, () => {
    const records = fullMonth(year, month);
    records[0] = { date: records[0].date, halfDay: true };
    const base = records.length * 1000;
    const result = calculateSalary(base, records, year, month);
    assert.equal(result.finalSalary, base - 500);
    assert.equal(result.cutDays, 0.5);
    assert.equal(result.present, records.length - 1);
    const emp = { name: 'Employee', email: 'employee@example.test', salary: base };
    const client = fallback(emp, records.map(r => ({ ...r, employeeEmail: emp.email })), year, month);
    assert.equal(client.finalSalary, result.finalSalary);
    assert.equal(client.cutDays, result.cutDays);
    assert.equal(salarySlipTotals(result, result.workingDays, result.cutDays).netPay, result.finalSalary);
  });
}

test('mixed attendance preserves paid leave, holiday and relief rules', () => {
  const records = fullMonth(2026, 9);
  ['halfDay', 'halfDay', 'absent', 'leave', 'leave', 'leave', 'holiday', 'leaveRelief'].forEach((status, i) => {
    records[i] = { date: records[i].date, [status]: true };
  });
  const r = calculateSalary(30000, records, 2026, 9);
  assert.equal(r.cutDays, 3);
  assert.equal(r.extraLeaves, 1);
  assert.equal(r.finalSalary, 27000);
  assert.equal(r.halfDay, 2);
});

test('unrecorded Sundays are paid; unrecorded weekdays are absent', () => {
  const r = calculateSalary(30000, [], 2026, 9);
  assert.equal(r.sundays, 4);
  assert.equal(r.absent, 26);
  assert.equal(r.finalSalary, 4000);
});

test('PDF matches payroll without rounding the daily rate early', () => {
  const records = fullMonth(2026, 7);
  records[0] = { date: records[0].date, halfDay: true };
  const r = calculateSalary(30000, records, 2026, 7);
  assert.equal(r.finalSalary, 29516);
  const slip = salarySlipTotals(r, 31, r.cutDays);
  assert.equal(slip.cutDeduction, 484);
  assert.equal(slip.netPay, r.finalSalary);
  const tie = salarySlipTotals({ baseSalary: 30003 }, 30, 5);
  assert.equal(tie.netPay, 25003);
});

test('PDF sums allowances and monetary deductions without charging leave counts', () => {
  const slip = salarySlipTotals({ baseSalary: 30000, medicalAllowance: 1000, travelingAllowance: 500,
    overtimePay: 200, holidayPay: 300, payTax: 100, leaves: 3, leaveDeductions: 50, loan: 250 }, 30, 0.5);
  assert.equal(slip.gross, 32000);
  assert.equal(slip.totalDeductions, 900);
  assert.equal(slip.netPay, 31100);
  assert.equal(salarySlipTotals({ baseSalary: 30000, leaves: 3 }, 30, 0).netPay, 30000);
});

test('salary preview and payroll creation agree', async () => {
  const { default: router } = await import('../routes/autoSalary.js');
  const { default: Roles } = await import('../models/Roles.js');
  const { default: Attendance } = await import('../models/Attendance.js');
  const { default: Payroll } = await import('../models/Payroll.js');
  const originals = [Roles.find, Attendance.find, Payroll.prototype.save];
  const records = fullMonth(2026, 9);
  records[0] = { date: records[0].date, halfDay: true };
  try {
    Roles.find = async () => [{ _id: 'test', name: 'Employee', branch: 'Main', salary: '30000' }];
    Attendance.find = async () => records;
    Payroll.prototype.save = async function () { return this; };
    const invoke = async (path) => {
      let output;
      const res = { json(value) { output = value; }, status(code) { assert.fail('HTTP ' + code); } };
      await router.stack.find(layer => layer.route?.path === path).route.stack[0].handle({ body: { year: 2026, month: 9 } }, res);
      return output;
    };
    const preview = await invoke('/calculate');
    const created = await invoke('/');
    assert.equal(preview[0].finalSalary, 29500);
    assert.equal(created.payrolls[0].salary, preview[0].finalSalary);
  } finally {
    [Roles.find, Attendance.find, Payroll.prototype.save] = originals;
  }
});

test('generated PDF contains corrected half-day deduction and net pay', async () => {
  const { createRequire } = await import('node:module');
  const requireClient = createRequire(new URL('../../client/package.json', import.meta.url));
  const { jsPDF } = requireClient('jspdf');
  const source = readFileSync(new URL('../../client/src/pages/admin/Payroll.jsx', import.meta.url), 'utf8');
  const body = source.slice(source.indexOf('    const generate = (dataUrl) => {'), source.indexOf('    img.onload = () => {'));
  const rendered = [];
  let saved = false;
  function Pdf() {
    const pdf = new jsPDF('p', 'pt', 'a4');
    const text = pdf.text.bind(pdf);
    pdf.text = (value, x, y, ...args) => {
      assert.ok(y <= pdf.internal.pageSize.getHeight() - 20, 'PDF text fits the page');
      rendered.push(String(value));
      return text(value, x, y, ...args);
    };
    pdf.save = () => { assert.ok(pdf.output().startsWith('%PDF-')); saved = true; };
    return pdf;
  }
  const generate = new Function('rec', 'jsPDF', 'salarySlipTotals', 'formatCurrency', 'numberToWords', 'toast', body + '; generate(null);');
  const records = fullMonth(2026, 9);
  records[0] = { date: records[0].date, halfDay: true };
  generate({ ...calculateSalary(30000, records, 2026, 9), employee: 'Employee', payrollMonth: '2026-09' },
    Pdf, salarySlipTotals, v => String(Number(v) || 0), { toWords: n => String(n) },
    { success() {}, error(message) { assert.fail(message); } });
  assert.ok(saved);
  assert.ok(rendered.includes('Half Day (50% paid):'));
  assert.ok(rendered.includes('500'));
  assert.ok(rendered.includes('PKR 29500'));
});
