const { verifyToken } = require('../utils/crypto');
const { User } = require('../models');
const response = require('../utils/response');

const authenticate = async (req, res, next) => {
  try {
    const { authorization } = req.headers;
    
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return res.status(401).json(response.error('Token akses wajib disertakan'));
    }
    
    const token = authorization.split(' ')[1];
    const decoded = verifyToken(token);
    
    // Get user from database to ensure user still exists and is active
    const user = await User.findByPk(decoded.sub);
    
    if (!user || !user.isActive) {
      return res.status(401).json(response.error('Token tidak valid atau kedaluwarsa'));
    }
    
    // Attach user and token payload to request
    req.user = decoded;
    req.currentUser = user;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json(response.error('Token tidak valid'));
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json(response.error('Token kedaluwarsa'));
    }
    return res.status(500).json(response.error('Kesalahan autentikasi'));
  }
};

module.exports = {
  authenticate,
};