const jwt = require('jsonwebtoken');
const databaseService = require('../config/databaseService');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
    const db = databaseService.getService();
    
    if (databaseService.type === 'supabase') {
      const user = await db.getUserById(decoded.userId);
      
      if (!user || !user.is_active) {
        return res.status(401).json({ message: 'Token is not valid' });
      }

      req.user = {
        id: user.id,
        userId: user.id, // For backward compatibility
        email: user.email,
        role: user.role,
        department: user.department,
        firstName: user.first_name,
        lastName: user.last_name,
        isActive: user.is_active
      };
    } else {
      // Fallback to MongoDB
      const User = require('../models/User');
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user || !user.isActive) {
        return res.status(401).json({ message: 'Token is not valid' });
      }

      req.user = user;
    }
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Access denied. Insufficient permissions.',
        required: roles,
        current: req.user.role
      });
    }
    
    next();
  };
};

const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Define permission mappings
    const permissionMap = {
      'view_incidents': ['admin', 'legal', 'manager', 'staff', 'viewer'],
      'edit_incidents': ['admin', 'legal', 'manager'],
      'create_incidents': ['admin', 'legal', 'manager', 'staff'],
      'delete_incidents': ['admin'],
      'assign_cases': ['admin', 'legal', 'manager'],
      'create_documents': ['admin', 'legal'],
      'send_legal_actions': ['admin', 'legal'],
      'view_reports': ['admin', 'legal', 'manager'],
      'manage_users': ['admin'],
      'system_settings': ['admin']
    };
    
    const allowedRoles = permissionMap[permission] || [];
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Access denied. Insufficient permissions.',
        required: allowedRoles,
        current: req.user.role
      });
    }
    
    next();
  };
};

const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
      const db = databaseService.getService();
      
      if (databaseService.type === 'supabase') {
        const user = await db.getUserById(decoded.userId);
        
        if (user && user.is_active) {
          req.user = {
            id: user.id,
            userId: user.id,
            email: user.email,
            role: user.role,
            department: user.department,
            firstName: user.first_name,
            lastName: user.last_name,
            isActive: user.is_active
          };
        }
      } else {
        // Fallback to MongoDB
        const User = require('../models/User');
        const user = await User.findById(decoded.userId).select('-password');
        
        if (user && user.isActive) {
          req.user = user;
        }
      }
    }
    
    next();
  } catch (error) {
    // Optional auth - continue even if token is invalid
    next();
  }
};

module.exports = {
  auth,
  requireRole,
  requirePermission,
  optionalAuth
};
