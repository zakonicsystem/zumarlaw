import jwt from 'jsonwebtoken';
import AuthState from '../models/AuthState.js';
import User from '../models/User.js';
import Roles from '../models/Roles.js';

const DEFAULT_TOKEN_EXPIRY = '1d';

export const issueToken = (payload, options = {}) => {
  const { expiresIn = DEFAULT_TOKEN_EXPIRY, ...rest } = options;
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn, ...rest });
};

export const verifyAppToken = async (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  await assertTokenIsActive(decoded);
  await assertUserTokenValid(decoded);
  return decoded;
};

export const forceLogoutAllDevices = async () => {
  const logoutAt = new Date();
  await AuthState.findOneAndUpdate(
    {},
    { globalLogoutAt: logoutAt },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return logoutAt;
};

const assertTokenIsActive = async (decoded) => {
  const authState = await AuthState.findOne().select('globalLogoutAt').lean();
  const globalLogoutAt = authState?.globalLogoutAt;

  if (!globalLogoutAt) {
    return;
  }

  const issuedAtMs = decoded?.iat ? decoded.iat * 1000 : 0;
  if (issuedAtMs && issuedAtMs < globalLogoutAt.getTime()) {
    const error = new Error('Token invalidated by global logout');
    error.name = 'TokenRevokedError';
    throw error;
  }
};

// ✅ Check if token was issued before user's last logout
export const assertUserTokenValid = async (decoded) => {
  const userId = decoded?.id;
  if (!userId) return;

  // Try User model first
  let user = await User.findById(userId).select('lastLogoutAt').lean();
  if (user && user.lastLogoutAt) {
    const issuedAtMs = decoded?.iat ? decoded.iat * 1000 : 0;
    if (issuedAtMs && issuedAtMs < user.lastLogoutAt.getTime()) {
      const error = new Error('Token invalidated by user logout');
      error.name = 'TokenRevokedError';
      throw error;
    }
    return;
  }

  // Try Roles model for employees
  let employee = await Roles.findById(userId).select('lastLogoutAt').lean();
  if (employee && employee.lastLogoutAt) {
    const issuedAtMs = decoded?.iat ? decoded.iat * 1000 : 0;
    if (issuedAtMs && issuedAtMs < employee.lastLogoutAt.getTime()) {
      const error = new Error('Token invalidated by user logout');
      error.name = 'TokenRevokedError';
      throw error;
    }
  }
};
