import { verifyJWT, authenticateAdmin, requireAdminRole, requirePages } from './authMiddleware.js';
const publicRoutes = new Set([
  'POST /auth/login', 'POST /auth/signup', 'POST /auth/forgot-password', 'POST /auth/reset-password',
  'GET /auth/google', 'GET /auth/google/callback', 'POST /admin/login', 'POST /admin/forgot-password', 'POST /admin/reset-password',
  'POST /employee-setup', 'POST /employee-login', 'POST /employee-login/employee-login', 'POST /employee-forgot-password', 'POST /employee-reset-password'
]);
const groups = [
  [/^\/autoSalary(?:\/|$)/i, ['/admin/salary', '/admin/payroll']],
  [/^\/payrolls(?:\/|$)/i, ['/admin/payroll', '/admin/payroll/add']],
  [/^\/attendance(?:\/|$)/i, ['/admin/attendance', '/admin/salary', '/admin/payroll']],
  [/^\/accounts(?:\/|$)/i, ['/admin/account']],
  [/^\/expense(?:\/|$)/i, ['/admin/expense', '/admin/expense-submissions']],
  [/^\/challans(?:\/|$)/i, ['/admin/challan']],
  [/^\/leads(?:\/|$)/i, ['/admin/leads', '/admin/leads/new', '/admin/leads/followup', '/admin/leads/mature', '/admin/leads/contacted', '/admin/leads/refusal', '/admin/leads/add', '/admin/leads/import']],
  [/^\/(?:manualService|mergeService)(?:\/|$)/i, ['/admin/services/manual', '/admin/services/merged', '/admin/add-service']],
  [/^\/(?:convertedService|mergeConvertedLeads)(?:\/|$)/i, ['/admin/services/converted', '/admin/services/merged']],
  [/^\/client-history(?:\/|$)/i, ['/admin/client-history']],
  [/^\/admin\/customers(?:\/|$)/i, ['/admin/customers']],
  [/^\/admin\/services\/converted(?:\/|$)/i, ['/admin/services/converted']],
  [/^\/(?:admin\/services|processing|service)(?:\/|$)/i, ['/admin/services', '/admin/add-service', '/admin/add-Service']],
  [/^\/forms\/(?!chat$|user$)/i, ['/admin/chat']],
];
export const apiAccess = (req, res, next) => {
  const path = (req.path.replace(/\/$/, '') || '/').toLowerCase();
  if (req.method === 'OPTIONS' || publicRoutes.has(req.method + ' ' + path)) return next();
  return verifyJWT(req, res, () => {
    if (/^\/auth\/(admin-register|mark-admin|user\/)/.test(path)) return authenticateAdmin(req, res, next);
    if (/^\/admin\/roles(?:\/|$)/.test(path)) {
      if (req.method !== 'GET') return authenticateAdmin(req, res, next);
      return requireAdminRole(req, res, next);
    }
    if (path.startsWith('/announcements') && req.method !== 'GET') return requirePages('/admin/announcment')(req,res,next);
    if (path.startsWith('/refund') && req.user.role === 'employee') return requirePages('/admin/refund-management','/admin/refunds')(req,res,next);
    if (path.startsWith('/expense/') && (path.endsWith('/pay') || req.method === 'DELETE')) return requirePages('/admin/expense', '/admin/account')(req, res, next);
    if (path.startsWith('/attendance') && req.method !== 'GET') return requirePages('/admin/attendance')(req, res, next);
    // Shared reads needed by dashboard, payroll dropdowns and service forms.
    if (['/branches','/employees','/payers','/payroll-months','/employee-login/employees'].includes(path)) return requireAdminRole(req, res, next);
    if (path === '/accounts/summary' && req.method === 'GET') return requirePages('/admin/account','/admin/expense')(req,res,next);
    if (path === '/service' && req.method === 'GET') return requirePages('/admin/services','/admin/challan','/admin/customers','/admin/account')(req,res,next);
    if (/^\/(processing|manualservice|convertedservice)\/[^/]+(?:\/payments(?:\/[^/]+)?)?$/.test(path) && req.user.assignedPages?.includes('/admin/account')) return next();
    for (const [pattern, pages] of groups) if (pattern.test(path)) return requirePages(...pages)(req, res, next);
    if (path.startsWith('/admin') || path.startsWith('/sms') || path.startsWith('/notifications') || path === '/invoices/delete-multiple' || (path === '/servicemessage' && req.method !== 'GET') || (path.startsWith('/refund') && (req.method === 'DELETE' || path.endsWith('/status')))) return requireAdminRole(req, res, next);
    if (/^\/(auth\/(verify-user|whoami)|employee\/me|userpanel\/services|forms\/(chat|user)|refund(?:\/[^/]+(?:\/details)?)?)$/.test(path) || (path === '/invoices' && req.method === 'POST') || (['/announcements','/servicemessage'].includes(path) && req.method === 'GET')) return next();
    return requirePages('/admin')(req,res,next);
  });
};
