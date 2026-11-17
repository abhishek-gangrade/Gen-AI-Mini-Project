import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

export const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this resource. No authentication token provided.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'resolveai_super_secret_jwt_key_2026');
    const user = await User.findById(decoded.id).select('-password');

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'The user belonging to this token no longer exists or is deactivated.'
      });
    }

    req.user = user;
    req.orgId = user.organization.toString();
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Not authorized. Invalid or expired token.'
    });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access forbidden: User role '${req.user ? req.user.role : 'unauthenticated'}' is not authorized for this action.`
      });
    }
    next();
  };
};
