const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const setupModuleMocks = require('./helpers/mock-modules');

const restoreModuleMocks = setupModuleMocks();

test.after(() => {
  restoreModuleMocks();
});

const controllerPath = path.resolve(__dirname, '../src/controllers/supervisor.controller.js');
const servicePath = path.resolve(__dirname, '../src/services/supervisor.service.js');
const modelsPath = path.resolve(__dirname, '../src/models/index.js');
const loggerPath = path.resolve(__dirname, '../src/utils/logger.js');
const excelPath = path.resolve(__dirname, '../src/utils/excel.js');

const loadController = (serviceMock) => {
  delete require.cache[controllerPath];
  delete require.cache[servicePath];
  delete require.cache[modelsPath];
  delete require.cache[loggerPath];
  delete require.cache[excelPath];

  require.cache[modelsPath] = {
    id: modelsPath,
    filename: modelsPath,
    loaded: true,
    exports: {
      Product: {},
      Store: {},
      User: {},
    },
  };

  require.cache[loggerPath] = {
    id: loggerPath,
    filename: loggerPath,
    loaded: true,
    exports: {
      info: () => {},
      error: () => {},
    },
  };

  require.cache[excelPath] = {
    id: excelPath,
    filename: excelPath,
    loaded: true,
    exports: {
      streamProductsXlsx: async () => {},
    },
  };

  require.cache[servicePath] = {
    id: servicePath,
    filename: servicePath,
    loaded: true,
    exports: {
      createSalesUser: async () => undefined,
      deleteSalesUser: async () => undefined,
      getSalesUsers: async () => undefined,
      getProducts: async () => undefined,
      deleteProduct: async () => undefined,
      ...serviceMock,
    },
  };

  const controller = require(controllerPath);

  const cleanup = () => {
    delete require.cache[controllerPath];
    delete require.cache[servicePath];
    delete require.cache[modelsPath];
    delete require.cache[loggerPath];
    delete require.cache[excelPath];
  };

  return { controller, cleanup };
};

test('deleteProduct controller returns success response when deletion succeeds', async () => {
  const resultPayload = { message: 'Product deleted successfully' };
  const { controller, cleanup } = loadController({
    deleteProduct: async () => resultPayload,
  });

  try {
    const req = {
      params: { id: 'product-123' },
      user: { sub: 'supervisor-1', store_id: 'store-1' },
    };

    let statusCode;
    let jsonPayload;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(payload) {
        jsonPayload = payload;
        return this;
      },
    };

    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };

    await controller.deleteProduct(req, res, next);

    assert.equal(statusCode, undefined);
    assert.ok(jsonPayload.success);
    assert.equal(jsonPayload.message, 'Product deleted successfully');
    assert.deepEqual(jsonPayload.data, resultPayload);
    assert.equal(nextCalled, false);
  } finally {
    cleanup();
  }
});

test('deleteProduct controller converts missing product to 404 response', async () => {
  const { controller, cleanup } = loadController({
    deleteProduct: async () => {
      const error = new Error('Product not found');
      throw error;
    },
  });

  try {
    const req = {
      params: { id: 'product-missing' },
      user: { sub: 'supervisor-1', store_id: 'store-1' },
    };

    let statusCode;
    let jsonPayload;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(payload) {
        jsonPayload = payload;
        return this;
      },
    };

    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };

    await controller.deleteProduct(req, res, next);

    assert.equal(statusCode, 404);
    assert.ok(!jsonPayload.success);
    assert.equal(jsonPayload.message, 'Product not found');
    assert.equal(nextCalled, false);
  } finally {
    cleanup();
  }
});
