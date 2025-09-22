const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const authService = require('../services/auth.service');
const response = require('../utils/response');
const { handleValidationErrors } = require('../middlewares/validate');
const config = require('../config');

// Rate limiting for login attempts
const loginLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    message: 'Too many login attempts, please try again later',
    data: null,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginValidation = [
  body('phone')
    .notEmpty()
    .withMessage('Phone number is required')
    .isLength({ min: 10, max: 20 })
    .withMessage('Phone number must be between 10 and 20 characters'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

const updatePasswordValidation = [
  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters'),
  body('currentPassword')
    .optional()
    .isString()
    .withMessage('Current password must be a string')
    .isLength({ min: 6 })
    .withMessage('Current password must be at least 6 characters'),
];

const login = async (req, res, next) => {
  try {
    const { phone, password } = req.body;

    const result = await authService.login(phone, password);
    
    res.json(response.success('Login successful', result));
  } catch (error) {
    if (error.message === 'Invalid credentials') {
      return res.status(401).json(response.error('Invalid phone number or password'));
    }
    next(error);
  }
};

const updatePassword = async (req, res, next) => {
  try {
    const { newPassword, currentPassword } = req.body;

    req.currentUser.password = newPassword;

    const updatedUser = await authService.updatePassword(req.currentUser, { currentPassword });

    res.json(response.success('Password updated successfully', updatedUser));
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json(response.error(error.message));
    }
    next(error);
  }
};

module.exports = {
  loginLimiter,
  loginValidation,
  login,
  updatePasswordValidation,
  updatePassword,
  handleValidationErrors,
};