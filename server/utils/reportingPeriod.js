export function reportingPeriod({ date, month, year } = {}) {
  if (!date && !month && !year) return null;
  let y, m, d = 1, next;
  if (date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Invalid report date');
    [y,m,d] = date.split('-').map(Number);
  } else { y = Number(year); m = month == null || month === '' ? 1 : Number(month); }
  if (!Number.isInteger(y) || y < 2000 || y > 2100 || !Number.isInteger(m) || m < 1 || m > 12 || !Number.isInteger(d) || d < 1 || d > new Date(Date.UTC(y,m,0)).getUTCDate()) throw new Error('Invalid reporting period');
  const start = new Date(Date.UTC(y,m-1,d) - 5 * 60 * 60 * 1000);
  if(date) next = new Date(start.getTime()+86400000);
  else if(month != null && month !== '') next = new Date(Date.UTC(y,m,1)-5*60*60*1000);
  else next = new Date(Date.UTC(y+1,0,1)-5*60*60*1000);
  return {start,end:next};
}
export function inPeriod(date,range) { const value = new Date(date); return !range || (Number.isFinite(value.getTime()) && value >= range.start && value < range.end); }
export function feesInPeriod(challans,range) {
  return challans.reduce((sum,c) => sum + ['challanFee','consultancyFee'].reduce((subtotal,key) => subtotal + (inPeriod(c[key]?.addedAt || c.createdAt,range) ? Number(c[key]?.amount || 0) : 0),0),0);
}
