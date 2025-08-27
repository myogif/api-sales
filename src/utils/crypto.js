const jwt = require('jsonwebtoken');
const config = require('../config');

const generateToken = (payload) => jwt.sign(payload, config.jwt.secret, {
  expiresIn: config.jwt.expiresIn,
});

const verifyToken = (token) => jwt.verify(token, config.jwt.secret);

const createTokenPayload = (user) => ({
  sub: user.id,
  role: user.role,
  store_id: user.storeId,
  supervisor_id: user.supervisorId,
});

module.exports = {
  generateToken,
  verifyToken,
  createTokenPayload,
};