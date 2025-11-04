const response = require('../utils/response');

const requireRole = (roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json(response.error('Authentication required'));
  }
  
  const userRole = req.user.role;
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  if (!allowedRoles.includes(userRole)) {
    return res.status(403).json(response.error('Insufficient permissions'));
  }
  
  next();
};

const requireManager = requireRole(['MANAGER']);
const requireServiceCenter = requireRole(['SERVICE_CENTER']);
const requireSupervisor = requireRole(['SUPERVISOR']);
const requireSales = requireRole(['SALES']);
const requireManagerOrSupervisor = requireRole(['MANAGER', 'SUPERVISOR']);
const requireSupervisorOrSales = requireRole(['SUPERVISOR', 'SALES']);
const requireManagerOrServiceCenter = requireRole(['MANAGER', 'SERVICE_CENTER']);

module.exports = {
  requireRole,
  requireManager,
  requireServiceCenter,
  requireSupervisor,
  requireSales,
  requireManagerOrSupervisor,
  requireSupervisorOrSales,
  requireManagerOrServiceCenter,
};
