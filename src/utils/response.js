const success = (message = 'Success', data = null) => ({
  success: true,
  message,
  data,
});

const error = (message = 'An error occurred', errors = null) => ({
  success: false,
  message,
  errors,
  data: null,
});

const paginated = (message = 'Data retrieved successfully', data) => ({
  success: true,
  message,
  data,
});

const validation = (errors) => ({
  success: false,
  message: 'Validation failed',
  errors: errors.map((err) => err.msg),
  data: null,
});

module.exports = {
  success,
  error,
  paginated,
  validation,
};