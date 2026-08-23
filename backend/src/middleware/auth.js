const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

/**
 * Verify JWT token and attach user to request
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { profile: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    next(error);
  }
};

/**
 * Require specific role(s)
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

/**
 * Require approved student status (PENDING and REJECTED students are restricted from protected endpoints)
 */
const requireApproved = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Admins and Management always bypass student approval check
  if (req.user.role === 'ADMIN' || req.user.role === 'MANAGEMENT') {
    return next();
  }

  const status = req.user.approvalStatus || 'APPROVED';

  if (status === 'PENDING') {
    return res.status(403).json({
      error: 'Your registration is awaiting admin approval.',
      approvalStatus: 'PENDING',
    });
  }

  if (status === 'REJECTED') {
    return res.status(403).json({
      error: 'Your registration was not approved.',
      approvalStatus: 'REJECTED',
      rejectionReason: req.user.rejectionReason || 'No specific reason provided.',
    });
  }

  next();
};

module.exports = { authenticate, requireRole, requireApproved };
