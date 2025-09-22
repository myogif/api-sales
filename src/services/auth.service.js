const { User } = require('../models');
const { generateToken, createTokenPayload } = require('../utils/crypto');
const logger = require('../utils/logger');

class AuthService {
  async login(phone, password) {
    try {
      // Find user with password
      const user = await User.scope('withPassword').findOne({
        where: { phone, isActive: true },
        include: [
          {
            model: require('../models').Store,
            as: 'store',
            attributes: ['id', 'name'],
          },
        ],
      });

      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Check password
      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      // Generate token
      const tokenPayload = createTokenPayload(user);
      const token = generateToken(tokenPayload);

      // Log successful login
      logger.info(`User ${user.phone} logged in successfully`, {
        userId: user.id,
        role: user.role,
      });

      return {
        token,
        user: user.toSafeJSON(),
      };
    } catch (error) {
      logger.error('Login failed:', {
        phone,
        error: error.message,
      });
      throw error;
    }
  }

  async resetPassword(phone, newPassword) {
    try {
      const user = await User.scope('withPassword').findOne({
        where: { phone, isActive: true },
      });

      if (!user) {
        return null;
      }

      user.password = newPassword;
      await user.save();

      logger.info(`Password reset for user ${user.phone}`, {
        userId: user.id,
      });

      return user.toSafeJSON();
    } catch (error) {
      logger.error('Password reset failed:', {
        phone,
        error: error.message,
      });
      throw error;
    }
  }
}

module.exports = new AuthService();
