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
    message: 'Terlalu banyak percobaan masuk, silakan coba lagi nanti',
    data: null,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginValidation = [
  body('phone')
    .notEmpty()
    .withMessage('Nomor telepon wajib diisi')
    .isLength({ min: 10, max: 20 })
    .withMessage('Nomor telepon harus antara 10 hingga 20 karakter'),
  body('password')
    .notEmpty()
    .withMessage('Kata sandi wajib diisi')
    .isLength({ min: 6 })
    .withMessage('Kata sandi harus memiliki minimal 6 karakter'),
];

const forgotPasswordValidation = [
  body('phone')
    .notEmpty()
    .withMessage('Nomor telepon wajib diisi')
    .isLength({ min: 10, max: 20 })
    .withMessage('Nomor telepon harus antara 10 hingga 20 karakter'),
];
const updatePasswordValidation = [
  body('newPassword')
    .notEmpty()
    .withMessage('Kata sandi baru wajib diisi')
    .isLength({ min: 6 })
    .withMessage('Kata sandi baru harus memiliki minimal 6 karakter'),
  body('currentPassword')
    .optional()
    .isString()
    .withMessage('Kata sandi saat ini harus berupa string')
    .isLength({ min: 6 })
    .withMessage('Kata sandi saat ini harus memiliki minimal 6 karakter'),
];

const login = async (req, res, next) => {
  try {
    const { phone, password } = req.body;

    const result = await authService.login(phone, password);

    res.json(response.success('Login berhasil', result));
  } catch (error) {
    if (error.message === 'Kredensial tidak valid') {
      return res.status(401).json(response.error('Nomor telepon atau kata sandi tidak valid'));
    }
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { phone, newPassword } = req.body;

    const user = await authService.resetPassword(phone, newPassword);

    if (!user) {
      return res
        .status(404)
        .json(response.error('Pengguna aktif dengan nomor telepon tersebut tidak ditemukan'));
    }

    return res.json(response.success('Kata sandi berhasil diperbarui', user));
  } catch (error) {
     if (error.statusCode) {
      return res.status(error.statusCode).json(response.error(error.message));
    }
    next(error);
  }
};

const updatePassword = async (req, res, next) => {
  try {
    const { newPassword, currentPassword } = req.body;

    req.currentUser.password = newPassword;

    const updatedUser = await authService.updatePassword(req.currentUser, { currentPassword });

    res.json(response.success('Kata sandi berhasil diperbarui', updatedUser));
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
  forgotPasswordValidation,
  forgotPassword,
  updatePasswordValidation,
  updatePassword,
  handleValidationErrors,
};