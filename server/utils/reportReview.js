import { metrics } from '../models/DailyAdReport.js';
export const reportStatus = report => report.reviewStatus || (report.reviewedAt ? 'approved' : 'pending');
export const revisionQuery = revision => revision === 0
  ? { $or: [{ revision: 0 }, { revision: { $exists: false } }] } : { revision };
export function reportValues(body) {
  if (typeof body.employeeSignature !== 'string' || !body.employeeSignature.trim() || body.employeeSignature.length > 160 ||
      metrics.some(k => !Number.isSafeInteger(body[k]) || body[k] < 0 || body[k] > 1000000)) throw new Error('Enter a signature and non-negative whole-number lead counts');
  for (const key of ['fakeComments', 'followUpComments', 'convertedClientName']) {
    if (typeof body[key] !== 'string' || body[key].length > (key === 'convertedClientName' ? 2000 : 4000)) throw new Error('Comments or client names are invalid or too long');
  }
  return { ...Object.fromEntries([...metrics, 'fakeComments', 'followUpComments', 'convertedClientName'].map(k => [k, body[k]])), employeeSignature: body.employeeSignature.trim() };
}
export const reportSnapshot = report => Object.fromEntries([...metrics, 'reportDate', 'dealingService', 'fakeComments', 'followUpComments', 'convertedClientName', 'employeeSignature'].map(k => [k, report[k]]));
