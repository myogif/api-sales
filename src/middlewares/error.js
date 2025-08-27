const logger = require('../utils/logger');
const response = require('../utils/response');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  // Sequelize validation error
  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map((error) => error.message);
    return res.status(400).json(response.error('Validation failed', errors));
  }

  // Sequelize unique constraint error
  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors[0]?.path;
    const message = field ? `${field} already exists` : 'Duplicate entry';
    return res.status(409).json(response.error(message));
  }

  // Sequelize foreign key constraint error
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json(response.error('Invalid reference to related record'));
  }

  // Sequelize database connection error
  if (err.name === 'SequelizeConnectionError') {
    return res.status(503).json(response.error('Database connection error'));
  }

  // JWT errors (handled in auth middleware but just in case)
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json(response.error('Invalid token'));
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json(response.error('Token expired'));
  }

  // Default to 500 server error
  res.status(err.statusCode || 500).json(
    response.error(
      process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : error.message || 'Something went wrong',
    ),
  );
};

module.exports = errorHandler;