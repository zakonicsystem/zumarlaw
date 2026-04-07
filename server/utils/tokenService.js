import jwt from 'jsonwebtoken';
import AuthState from '../models/AuthState.js';

const DEFAULT_TOKEN_EXPIRY = '1d';

export const issueToken = (payload, options = {}) => {
  const { expiresIn = DEFAULT_TOKEN_EXPIRY, ...rest } = options;
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn, ...rest });
};

export const verifyAppToken = async (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  await assertTokenIsActive(decoded);
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
