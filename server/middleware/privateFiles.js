import path from 'path';
import { fileURLToPath } from 'url';
import { resolveIdentity } from './authMiddleware.js';
import Service from '../models/Service.js';
import Manual from '../models/ManualServiceSubmission.js';
import Converted from '../models/ConvertedLead.js';
import Expense from '../models/Expense.js';
import Refund from '../models/Refund.js';
const root = fileURLToPath(new URL('../uploads/', import.meta.url));
export function referencesFile(value, filename) {
  if (typeof value === 'string') return value.replace(/\\/g, '/').split('/').pop() === filename;
  if (Array.isArray(value)) return value.some(v => referencesFile(v, filename));
  return value && typeof value === 'object' && Object.values(value).some(v => referencesFile(v, filename));
}
export function canReadServiceFile(user, service, filename) {
  if (user.role === 'admin') return true;
  if (user.role === 'user') return String(service.userId || '') === String(user.id) || String(service.email || '').toLowerCase() === user.email?.toLowerCase();
  if (service.certificate && referencesFile(service.certificate, filename)) return false;
  const assigned = String(service.assignedTo || '').toLowerCase().trim();
  return user.canViewAllServices || [user.id, user.name, user.email].some(v => v && assigned === String(v).toLowerCase().trim());
}
export async function privateFiles(req, res) {
  if (!['GET','HEAD'].includes(req.method)) return res.sendStatus(405);
  try {
    const token = req.headers.authorization?.replace(/^Bearer /, '') || req.cookies?.portal_files;
    if (!token) return res.status(401).json({ message: 'Please sign in to download documents' });
    const user = await resolveIdentity(token);
    const filename = decodeURIComponent(req.path.slice(1));
    if (!filename || filename !== path.basename(filename) || filename.includes('..') || /[\\\/\x00-\x1f]/.test(filename)) return res.sendStatus(400);
    let allowed = user.role === 'admin';
    if (!allowed) {
      const models = [[Service,'/admin/services'],[Manual,'/admin/services/manual'],[Converted,'/admin/services/converted']];
      for (const [Model, page] of models) {
        if (user.role === 'employee' && !user.assignedPages.includes(page)) continue;
        const query = user.role === 'user' ? (Model === Service ? { userId: user.id } : { email: user.email }) : {};
        const docs = await Model.find(query).lean();
        if (docs.some(doc => canReadServiceFile(user,doc,filename) && referencesFile(doc,filename))) { allowed = true; break; }
      }
      if (!allowed && user.role === 'employee' && user.assignedPages.some(p => ['/admin/expense','/admin/expense-submissions','/admin/account'].includes(p))) {
        allowed = (await Expense.find().lean()).some(doc => referencesFile(doc, filename));
      }
      if (!allowed && (user.role === 'user' || user.assignedPages?.some(p => ['/admin/refund-management','/admin/refunds'].includes(p)))) {
        const query = user.role === 'user' ? { createdBy: user.id } : {};
        allowed = (await Refund.find(query).lean()).some(doc => referencesFile(doc,filename));
      }
    }
    if (!allowed) return res.sendStatus(403);
    res.set({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "sandbox; default-src 'none'" });
    return res.sendFile(filename, { root, dotfiles: 'deny' }, error => { if (error && !res.headersSent) res.sendStatus(error.statusCode || 404); });
  } catch { return res.status(401).json({ message: 'Invalid session or document request' }); }
}
