const { validationResult } = require('express-validator');
const response = require('../utils/response');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json(response.validation(errors.array()));
  }
  next();
};

module.exports = {
  handleValidationErrors,
};