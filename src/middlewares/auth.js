const { verifyToken } = require('../utils/crypto');
const { User } = require('../models');
const response = require('../utils/response');

const authenticate = async (req, res, next) => {
  try {
    const { authorization } = req.headers;
    
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return res.status(401).json(response.error('Access token required'));
    }
    
    const token = authorization.split(' ')[1];
    const decoded = verifyToken(token);
    
    // Get user from database to ensure user still exists and is active
    const user = await User.findByPk(decoded.sub);
    
    if (!user || !user.isActive) {
      return res.status(401).json(response.error('Invalid or expired token'));
    }
    
    // Attach user and token payload to request
    req.user = decoded;
    req.currentUser = user;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json(response.error('Invalid token'));
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json(response.error('Token expired'));
    }
    return res.status(500).json(response.error('Authentication error'));
  }
};

module.exports = {
  authenticate,
};