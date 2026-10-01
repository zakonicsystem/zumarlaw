import express from 'express';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import SystemSettings from '../models/SystemSettings.js';
import {
  getMaintenanceSettings,
  isSuperAdminRecord,
  setMaintenanceMode,
  API_CONTROL_GROUPS,
  defaultApiControls,
} from '../utils/maintenanceMode.js';

const router = express.Router();

const requireSuperAdmin = async (req, res, next) => {
  const authorization = req.headers.authorization;
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
  if (!token || !process.env.JWT_SECRET) {
    return res.status(401).json({ message: 'Unauthorized access' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(decoded.id);
    if (!isSuperAdminRecord(admin)) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }
    req.superAdmin = admin;
    return next();
  } catch {
    return res.status(401).json({ message: 'Unauthorized access' });
  }
};

router.get('/status', async (req, res) => {
  try {
    const settings = await getMaintenanceSettings();
    res.json({
      maintenanceMode: settings.maintenanceMode === true,
      smsApiEnabled: settings.smsApiEnabled !== false,
      accountApiEnabled: settings.accountApiEnabled !== false,
      externalApisEnabled: settings.externalApisEnabled !== false,
      message: settings.maintenanceMessage,
      updatedAt: settings.updatedAt,
    });
  } catch (error) {
    res.status(500).json({ message: 'Unable to read system status' });
  }
});

router.get('/access', requireSuperAdmin, (req, res) => {
  res.json({ authorized: true });
});

router.get('/api-controls', requireSuperAdmin, async (req, res) => {
  const settings = await getMaintenanceSettings();
  res.json({ controls: { ...defaultApiControls(), ...(settings.apiControls || {}) }, groups: API_CONTROL_GROUPS });
});

router.put('/api-controls', requireSuperAdmin, async (req, res) => {
  const controls = Object.fromEntries(Object.keys(API_CONTROL_GROUPS).map((key) => [key, req.body?.controls?.[key] !== false]));
  const settings = await SystemSettings.findOneAndUpdate({ key: 'global' }, { $set: { apiControls: controls, updatedBy: req.superAdmin.email } }, { new: true, upsert: true, setDefaultsOnInsert: true }).lean();
  res.json({ controls: { ...defaultApiControls(), ...(settings.apiControls || {}) } });
});

router.put('/maintenance', requireSuperAdmin, async (req, res) => {
  try {
    const settings = await setMaintenanceMode({
      enabled: req.body.enabled === true,
      smsApiEnabled: req.body.smsApiEnabled,
      accountApiEnabled: req.body.accountApiEnabled,
      externalApisEnabled: req.body.externalApisEnabled,
      message: req.body.message,
      updatedBy: req.superAdmin.email,
    });
    res.json({
      message: settings.maintenanceMode ? 'Maintenance mode enabled' : 'Maintenance mode disabled',
      maintenanceMode: settings.maintenanceMode,
      smsApiEnabled: settings.smsApiEnabled !== false,
      accountApiEnabled: settings.accountApiEnabled !== false,
      externalApisEnabled: settings.externalApisEnabled !== false,
      maintenanceMessage: settings.maintenanceMessage,
      updatedAt: settings.updatedAt,
    });
  } catch (error) {
    console.error('Failed to update maintenance mode:', error);
    res.status(500).json({ message: 'Unable to update maintenance mode' });
  }
});

export default router;
