const config = require('./index');

const dbTimezone = process.env.DB_TIMEZONE || '+07:00';
const normalizedDialect = (config.database.dialect || '').toLowerCase();
const isMySQLDialect = ['mysql', 'mariadb'].includes(normalizedDialect);

const baseDialectOptions = {
  ...(isMySQLDialect
    ? {
        dateStrings: true,
        typeCast(field, next) {
          if (field.type === 'DATETIME' || field.type === 'TIMESTAMP') {
            return field.string();
          }

          return next();
        },
      }
    : {}),
};

const baseDefine = {
  timestamps: true,
  paranoid: false,
  underscored: true,
};

const baseConfig = {
  username: config.database.username,
  password: config.database.password,
  host: config.database.host,
  port: config.database.port,
  dialect: config.database.dialect,
  logging: false,
  timezone: dbTimezone,
  dialectOptions: baseDialectOptions,
  define: baseDefine,
};

module.exports = {
  development: {
    ...baseConfig,
    database: config.database.database,
  },
  test: {
    ...baseConfig,
    database: `${config.database.database}_test`,
  },
  production: {
    ...baseConfig,
    database: config.database.database,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },
};