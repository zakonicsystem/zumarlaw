import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Roles from '../models/Roles.js';
import Admin from '../models/Admin.js';

export async function resolveIdentity(token) {
  if (!process.env.JWT_SECRET) throw new Error('Authentication is not configured');
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (!decoded.id || decoded.purpose) throw new Error('Invalid access token');
  const admin = await Admin.findById(decoded.id);
  if (admin) return { id: admin._id, email: admin.email, name: admin.firstName, role: 'admin', accountType: 'admin' };
  const user = await User.findById(decoded.id);
  if (user && user.isActive !== false) return { id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName,
    name: [user.firstName, user.lastName].filter(Boolean).join(' '), role: user.isAdmin ? 'admin' : 'user', accountType: 'user' };
  const employee = await Roles.findById(decoded.id);
  if (employee && employee.employmentStatus !== 'terminated') return {
    id: employee._id, name: employee.name, email: employee.login?.email || employee.email,
    role: 'employee', jobRole: employee.role, accountType: 'employee', assignedPages: employee.assignedPages || [],
    canViewAllLeads: employee.canViewAllLeads === true || employee.canViewAllLeadsAndServices === true,
    canViewAllServices: employee.canViewAllServices === true || employee.canViewAllLeadsAndServices === true
  };
  throw new Error('Account is inactive or no longer exists');
}
export const verifyJWT = async (req, res, next) => {
  if (req.authVerified && req.user) return next();
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ message: 'Please sign in' });
  try {
    req.user = await resolveIdentity(header.slice(7));
    req.authVerified = true;
    // Read-only file requests use an HttpOnly cookie; API writes still require Bearer auth.
    res.cookie?.('portal_files', header.slice(7), { httpOnly: true, secure: req.secure, sameSite: 'lax', path: '/uploads', maxAge: 60 * 60 * 1000 });
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired session' });
  }
};
export const authenticateAdmin = (req, res, next) => verifyJWT(req, res, () => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Administrator access required' });
  req.admin = req.user;
  return next();
});
export const tryVerify = async (req, res, next) => {
  if (req.authVerified) return next();
  if (!req.headers.authorization) return next();
  return verifyJWT(req, res, next);
};
export const requireAdminRole = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Please sign in' });
  if (!['admin', 'employee'].includes(req.user.role)) return res.status(403).json({ error: 'Staff access required' });
  return next();
};
export const requirePages = (...pages) => (req, res, next) => {
  if (req.user?.role === 'admin') return next();
  if (req.user?.role !== 'employee' || !pages.some(p => req.user.assignedPages?.includes(p))) {
    return res.status(403).json({ message: 'You do not have permission for this operation' });
  }
  return next();
};
