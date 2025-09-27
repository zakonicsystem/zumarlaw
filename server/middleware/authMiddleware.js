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

    // Try to find user in User model (admin)
    let user = await User.findById(decoded.id);
    console.log('[verifyJWT] User model lookup:', user ? 'Found' : 'Not found');
    if (user) {
      req.user = {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: 'admin'
      };
      console.log('[verifyJWT] Authenticated as admin:', req.user);
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

    // Not found in either model
    console.warn('[verifyJWT] No user/employee found for id:', decoded.id);
    return res.status(401).json({ message: 'User/Employee not found. Logging out.' });
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
      email: decoded.email
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
