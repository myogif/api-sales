const Module = require('node:module');
const path = require('node:path');

const stubMap = {
  'express-validator': path.resolve(__dirname, '../stubs/express-validator.js'),
  jsonwebtoken: path.resolve(__dirname, '../stubs/jsonwebtoken.js'),
  dotenv: path.resolve(__dirname, '../stubs/dotenv.js'),
  sequelize: path.resolve(__dirname, '../stubs/sequelize.js'),
  uuid: path.resolve(__dirname, '../stubs/uuid.js'),
  exceljs: path.resolve(__dirname, '../stubs/exceljs.js'),
};

module.exports = () => {
  const originalResolveFilename = Module._resolveFilename;

  Module._resolveFilename = function mockResolve(request, parent, isMain, options) {
    if (stubMap[request]) {
      return stubMap[request];
    }
    return originalResolveFilename.call(this, request, parent, isMain, options);
  };

  return () => {
    Module._resolveFilename = originalResolveFilename;
    Object.values(stubMap).forEach((stubPath) => {
      delete require.cache[stubPath];
    });
  };
};
