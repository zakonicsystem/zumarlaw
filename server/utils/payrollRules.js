export function payrollPeriod(year, month) {
  year = Number(year); month = Number(month);
  if (!Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) throw new Error('Choose a valid payroll month and year');
  return { year, month, key: year + '-' + String(month).padStart(2,'0') };
}
export function employeeCountsForSalaryMonth(employee, year, month) {
  if (employee.employmentStatus !== 'terminated' || !employee.terminatedAt) return true;
  const date = new Date(employee.terminatedAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });
  return date.slice(0,7) >= payrollPeriod(year,month).key;
}
export const payrollIdentity = (employee, period) => String(employee._id) + ':' + period;
export function existingPayrollQuery(employee, period) {
  return { status: { $ne: 'Voided' }, payrollMonth: { $regex: '^' + period + '(?:$|-)' }, $or: [{ employeeId: employee._id }, { employee: employee.name, branch: employee.branch || '' }] };
}
export function auditEntry(user, action, before, after, reason) {
  return { actorId: String(user?.id || ''), actorName: user?.email || user?.name || 'Unknown', action, before, after, reason, at: new Date() };
}
