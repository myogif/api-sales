const config = require('./index');

module.exports = {
  development: {
    username: config.database.username,
    password: config.database.password,
    database: config.database.database,
    host: config.database.host,
    port: config.database.port,
    dialect: config.database.dialect,
    logging: false,
    define: {
      timestamps: true,
      paranoid: false,
      underscored: true,
    },
  },
  test: {
    username: config.database.username,
    password: config.database.password,
    database: `${config.database.database}_test`,
    host: config.database.host,
    port: config.database.port,
    dialect: config.database.dialect,
    logging: false,
    define: {
      timestamps: true,
      paranoid: false,
      underscored: true,
    },
  },
  production: {
    username: config.database.username,
    password: config.database.password,
    database: config.database.database,
    host: config.database.host,
    port: config.database.port,
    dialect: config.database.dialect,
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    define: {
      timestamps: true,
      paranoid: false,
      underscored: true,
    },
  },
};