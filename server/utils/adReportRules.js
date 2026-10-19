export function periodRange(period = 'daily', date = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' })) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !['daily', 'weekly', 'monthly'].includes(period)) throw new Error('Invalid reporting period or date');
  const start = new Date(date + 'T00:00:00Z');
  if (!Number.isFinite(start.getTime()) || start.toISOString().slice(0, 10) !== date) throw new Error('Invalid date');
  const end = new Date(start);
  if (period === 'weekly') { start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7); end.setTime(start.getTime()); end.setUTCDate(end.getUTCDate() + 6); }
  if (period === 'monthly') { start.setUTCDate(1); end.setUTCMonth(end.getUTCMonth() + 1, 0); }
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}
