import User from '../models/User.js';
import Roles from '../models/Roles.js';
import Admin from '../models/Admin.js';
import Session from '../models/Session.js';
import { verifyAppToken } from '../utils/tokenService.js';

export const verifyJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ message: 'JWT_SECRET not set in environment' });
  }

  try {
    const decoded = await verifyAppToken(token);
    console.log('[verifyJWT] Decoded token:', decoded);

    const user = await User.findById(decoded.id);
    console.log('[verifyJWT] User model lookup:', user ? 'Found' : 'Not found');
    if (user) {
      const session = await Session.findOne({ token, isActive: true });
      if (!session) {
        console.warn('[verifyJWT] Session not found or inactive for token');
        return res.status(401).json({ message: 'Session expired or logged out. Please login again.' });
      }

      session.lastActivityAt = new Date();
      await session.save();

      let role = 'user';
      if (user.isAdmin) {
        role = 'admin';
      } else if (decoded.role) {
        role = decoded.role;
      }

      req.user = {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role,
      };
      console.log('[verifyJWT] Authenticated user:', req.user);
      return next();
    }

    const employee = await Roles.findById(decoded.id);
    console.log('[verifyJWT] Roles model lookup:', employee ? 'Found' : 'Not found');
    if (employee) {
      req.user = {
        id: employee._id,
        email: employee.login?.email,
        role: employee.role || 'employee',
        assignedPages: employee.assignedPages || [],
      };
      console.log('[verifyJWT] Authenticated as employee:', req.user);
      return next();
    }

    const admin = await Admin.findById(decoded.id);
    if (admin) {
      req.user = {
        id: admin._id,
        email: admin.email,
        role: 'admin',
      };
      return next();
    }

    console.warn('[verifyJWT] No user/employee/admin found in DB for id:', decoded.id);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role || 'admin',
      fromToken: true,
    };
    return next();
  } catch (error) {
    console.error('[verifyJWT] JWT error:', error);
    const message = error.name === 'TokenRevokedError'
      ? 'Session invalidated. Please login again.'
      : 'Invalid or expired token';
    return res.status(401).json({ message });
  }
};

export const authenticateAdmin = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token =
    req.cookies?.token || (authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null);

  if (!token) {
    console.warn('Admin auth failed: No token provided');
    return res.status(401).json({ message: 'Not authorized' });
  }

  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined in environment');
    }

    const decoded = await verifyAppToken(token);

    if (!decoded?.id) {
      return res.status(401).json({ message: 'Invalid token payload' });
    }

    const admin = await Admin.findById(decoded.id).select('_id email');
    if (!admin) {
      return res.status(401).json({ message: 'Admin account not found' });
    }

    req.admin = {
      id: admin._id,
      email: admin.email,
      role: 'admin',
    };

    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      console.warn('Admin token expired');
      return res.status(401).json({ message: 'Token expired' });
    }

    if (error.name === 'TokenRevokedError') {
      return res.status(401).json({ message: 'Token is invalidated. Please log in again.' });
    }

    console.error('Admin token verification failed:', error.message);
    return res.status(401).json({ message: 'Token is invalid or expired' });
  }
};

export const tryVerify = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    if (!process.env.JWT_SECRET) {
      console.warn('JWT_SECRET not defined');
      return next();
    }

    const decoded = await verifyAppToken(token);

    const user = await User.findById(decoded.id);
    if (user) {
      const session = await Session.findOne({ token, isActive: true });
      if (!session) {
        console.warn('[tryVerify] Session not found or inactive for token');
        return next();
      }

      session.lastActivityAt = new Date();
      await session.save();

      req.user = {
        id: user._id,
        email: user.email,
        role: user.isAdmin ? 'admin' : 'user',
      };
      return next();
    }

    const employee = await Roles.findById(decoded.id);
    if (employee) {
      req.user = {
        id: employee._id,
        email: employee.login?.email,
        role: employee.role || 'employee',
        assignedPages: employee.assignedPages || [],
      };
      return next();
    }

    const admin = await Admin.findById(decoded.id);
    if (admin) {
      req.user = {
        id: admin._id,
        email: admin.email,
        role: 'admin',
      };
      return next();
    }

    return next();
  } catch (err) {
    console.warn('[tryVerify] Token invalid/expired; allowing request to continue without auth');
    return next();
  }
};

export const requireAdminRole = (req, res, next) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized. Authentication required.' });
  }

  const validAdminRoles = ['admin', 'employee'];
  if (!user.role || !validAdminRoles.includes(user.role)) {
    console.warn(`[requireAdminRole] User ${user.email} attempted admin action but has role: ${user.role}`);
    return res.status(403).json({ error: 'Forbidden. Admin access required.' });
  }

  console.log(`[requireAdminRole] User ${user.email} (${user.role}) authorized for admin action`);
  return next();
};
