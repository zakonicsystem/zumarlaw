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
    const superAdmin = await requestIsFromSuperAdmin(req);
    if (superAdmin) return next();
    const blockedIntegration = req.path.startsWith('/api/sms') && settings.smsApiEnabled === false
      ? 'SMS/Vevotech API'
      : req.path.startsWith('/api/accounts') && settings.accountApiEnabled === false
        ? 'Accounts API'
        : ['/api/serviceMessage', '/api/notifications'].some((prefix) => req.path.startsWith(prefix)) && settings.externalApisEnabled === false
          ? 'External integrations' : null;
    if (blockedIntegration) return res.status(503).json({ apiBlocked: true, message: `${blockedIntegration} is currently disabled by the Super Admin.` });
    if (!settings.maintenanceMode) return next();

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
