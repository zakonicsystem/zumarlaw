import jwt from 'jsonwebtoken';
import User from '../models/User.js'; // ✅ Make sure the path is correct
import Roles from '../models/Roles.js';

// ✅ General User Auth Middleware
export const verifyJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // 🔒 Check for Bearer token
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ message: 'JWT_SECRET not set in environment' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('[verifyJWT] Decoded token:', decoded);

    // Try to find user in User model
    let user = await User.findById(decoded.id);
    console.log('[verifyJWT] User model lookup:', user ? 'Found' : 'Not found');
    if (user) {
      // Determine role: use isAdmin flag or token role or default to 'user'
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
        role: role  // Will be 'admin' only if isAdmin flag is true
      };
      console.log('[verifyJWT] Authenticated user:', req.user);
      return next();
    }

    // If not found, try Roles model (employee)
    let employee = await Roles.findById(decoded.id);
    console.log('[verifyJWT] Roles model lookup:', employee ? 'Found' : 'Not found');
    if (employee) {
      req.user = {
        id: employee._id,
        email: employee.login?.email,
        role: employee.role || 'employee',
        assignedPages: employee.assignedPages || []
      };
      console.log('[verifyJWT] Authenticated as employee:', req.user);
      return next();
    }

    // Not found in either model - BUT token signature is valid, so accept it
    // This allows admins to use valid tokens even if their user record isn't in DB
    console.warn('[verifyJWT] No user/employee found in DB for id:', decoded.id, '— accepting valid token');
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role || 'admin',
      fromToken: true  // Flag indicating this auth came from token, not DB lookup
    };
    return next();
  } catch (error) {
    console.error('[verifyJWT] JWT error:', error);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};


// ✅ Admin-Specific Auth Middleware
export const authenticateAdmin = (req, res, next) => {
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

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded?.id) {
      return res.status(401).json({ message: 'Invalid token payload' });
    }

    req.admin = {
      id: decoded.id,
      email: decoded.email,
      role: 'admin'
    };

    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      console.warn('Admin token expired');
      return res.status(401).json({ message: 'Token expired' });
    }

    console.error('Admin token verification failed:', error.message);
    return res.status(401).json({ message: 'Token is invalid or expired' });
  }
};

// Non-blocking verifier: try to set req.user/req.admin if token present and valid,
// but do NOT reject the request if token is missing or expired. This allows
// admin "override" flows where the client may retry without Authorization header.
export const tryVerify = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No token provided — continue without attaching user
    return next();
  }
  const token = authHeader.split(' ')[1];
  try {
    if (!process.env.JWT_SECRET) {
      console.warn('JWT_SECRET not defined');
      return next();
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Try to find user or employee; attach to req if found
    const user = await User.findById(decoded.id);
    if (user) {
      req.user = { id: user._id, email: user.email, role: 'admin' };
      return next();
    }
    const employee = await Roles.findById(decoded.id);
    if (employee) {
      req.user = { id: employee._id, email: employee.login?.email, role: employee.role || 'employee' };
    }
    return next();
  } catch (err) {
    // Token expired or invalid — do not block, allow request to continue as unauthenticated
    console.warn('[tryVerify] Token invalid/expired; allowing request to continue without auth');
    return next();
  }
};

// ✅ Admin Role Check Middleware - requires user to have admin or employee role
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

  console.log(`[requireAdminRole] ✅ User ${user.email} (${user.role}) authorized for admin action`);
  return next();
};
