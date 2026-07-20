import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import { getMaintenanceSettings, isSuperAdminRecord } from '../utils/maintenanceMode.js';

const getBearerToken = (req) => {
  const authorization = req.headers.authorization;
  return authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
};

const requestIsFromSuperAdmin = async (req) => {
  const token = getBearerToken(req);
  if (!token || !process.env.JWT_SECRET) return false;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(decoded.id).select('email isSuperAdmin');
    return isSuperAdminRecord(admin);
  } catch {
    return false;
  }
};

export const maintenanceGuard = async (req, res, next) => {
  if (req.method === 'OPTIONS' || req.path === '/test' || req.path === '/api/admin/login') {
    return next();
  }

  try {
    const settings = await getMaintenanceSettings();
    if (!settings.maintenanceMode || await requestIsFromSuperAdmin(req)) return next();

    return res.status(503).json({
      maintenance: true,
      message: settings.maintenanceMessage,
      updatedAt: settings.updatedAt,
    });
  } catch (error) {
    console.error('Maintenance guard failed:', error);
    return next();
  }
};
