import SystemSettings from '../models/SystemSettings.js';

const DEFAULT_MESSAGE = 'The Zumar Law Firm system is temporarily unavailable for scheduled maintenance.';
const CACHE_TTL_MS = 2000;

export const API_CONTROL_GROUPS = {
  sms: { label: 'SMS / Vevotech', prefixes: ['/api/sms'] },
  accounts: { label: 'Accounts', prefixes: ['/api/accounts'] },
  leads: { label: 'Leads', prefixes: ['/api/leads', '/api/mergeConvertedLeads'] },
  services: { label: 'Services', prefixes: ['/api/service', '/api/admin/services', '/api/manualService', '/api/convertedService', '/api/mergeService'] },
  payroll: { label: 'Payroll', prefixes: ['/api/payrolls', '/api/autoSalary'] },
  attendance: { label: 'Attendance', prefixes: ['/api/attendance'] },
  expenses: { label: 'Expenses', prefixes: ['/api/expense'] },
  refunds: { label: 'Refunds', prefixes: ['/api/refund'] },
  forms: { label: 'Forms', prefixes: ['/api/forms'] },
  notifications: { label: 'Notifications', prefixes: ['/api/notifications'] },
  customers: { label: 'Customers / Users', prefixes: ['/api/userpanel', '/api/users'] },
  other: { label: 'Other APIs', prefixes: ['/api'] },
};

export const defaultApiControls = () => Object.fromEntries(Object.keys(API_CONTROL_GROUPS).map((key) => [key, true]));

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
    { $setOnInsert: { maintenanceMode: false, smsApiEnabled: true, accountApiEnabled: true, externalApisEnabled: true, apiControls: defaultApiControls(), maintenanceMessage: DEFAULT_MESSAGE } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  cachedSettings = settings;
  cacheExpiresAt = Date.now() + CACHE_TTL_MS;
  return settings;
};

export const setMaintenanceMode = async ({ enabled, message, updatedBy, smsApiEnabled, accountApiEnabled, externalApisEnabled }) => {
  const update = {
    maintenanceMode: enabled === true,
    updatedBy: String(updatedBy || ''),
  };
  for (const [field, value] of Object.entries({ smsApiEnabled, accountApiEnabled, externalApisEnabled })) {
    if (typeof value === 'boolean') update[field] = value;
  }
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
