import SystemSettings from '../models/SystemSettings.js';

const DEFAULT_MESSAGE = 'The Zumar Law Firm system is temporarily unavailable for scheduled maintenance.';
const CACHE_TTL_MS = 2000;

let cachedSettings = null;
let cacheExpiresAt = 0;

const configuredSuperAdminEmails = () => String(process.env.SUPER_ADMIN_EMAIL || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export const isSuperAdminRecord = (admin) => {
  if (!admin) return false;
  const email = String(admin.email || '').trim().toLowerCase();
  return admin.isSuperAdmin === true || configuredSuperAdminEmails().includes(email);
};

export const getMaintenanceSettings = async ({ fresh = false } = {}) => {
  if (!fresh && cachedSettings && Date.now() < cacheExpiresAt) return cachedSettings;

  const settings = await SystemSettings.findOneAndUpdate(
    { key: 'global' },
    { $setOnInsert: { maintenanceMode: false, maintenanceMessage: DEFAULT_MESSAGE } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  cachedSettings = settings;
  cacheExpiresAt = Date.now() + CACHE_TTL_MS;
  return settings;
};

export const setMaintenanceMode = async ({ enabled, message, updatedBy }) => {
  const update = {
    maintenanceMode: enabled === true,
    updatedBy: String(updatedBy || ''),
  };
  if (String(message || '').trim()) update.maintenanceMessage = String(message).trim();

  const settings = await SystemSettings.findOneAndUpdate(
    { key: 'global' },
    { $set: update, $setOnInsert: { key: 'global' } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  cachedSettings = settings;
  cacheExpiresAt = Date.now() + CACHE_TTL_MS;
  return settings;
};
