const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const setupModuleMocks = require('./helpers/mock-modules');

const restoreModuleMocks = setupModuleMocks();

const { validationResult } = require('express-validator');

test.after(() => {
  restoreModuleMocks();
});

const controllerPath = path.resolve(__dirname, '../src/controllers/sales.controller.js');
const servicePath = path.resolve(__dirname, '../src/services/sales.service.js');
const modelsPath = path.resolve(__dirname, '../src/models/index.js');
const loggerPath = path.resolve(__dirname, '../src/utils/logger.js');
const excelPath = path.resolve(__dirname, '../src/utils/excel.js');
const { formatProductForOutput } = require('../src/utils/product-pricing');

const loadController = (serviceMock) => {
  delete require.cache[controllerPath];
  delete require.cache[servicePath];
  delete require.cache[modelsPath];
  delete require.cache[loggerPath];
  delete require.cache[excelPath];

  const baseMock = {
    createProduct: async () => undefined,
    deleteProduct: async () => undefined,
    updateProduct: async () => undefined,
  };

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
    exports: { ...baseMock, ...serviceMock },
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

const runValidations = async (validations, req) => {
  for (const validation of validations) {
    // eslint-disable-next-line no-await-in-loop
    await validation.run(req);
  }
  return validationResult(req);
};

test('updateProduct controller returns success response with updated product', async () => {
  const updatedProduct = { id: 'product-123', name: 'Updated Name' };
  const { controller, cleanup } = loadController({
    updateProduct: async () => updatedProduct,
  });

  try {
    const req = {
      params: { id: 'product-123' },
      body: { name: 'Updated Name' },
      user: { sub: 'sales-1' },
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

    await controller.updateProduct(req, res, next);

    assert.equal(statusCode, undefined);
    assert.ok(jsonPayload.success);
    assert.equal(jsonPayload.message, 'Product updated successfully');
    assert.deepEqual(jsonPayload.data, formatProductForOutput(updatedProduct));
    assert.equal(nextCalled, false);
  } finally {
    cleanup();
  }
});

test('updateProduct controller converts missing product to 404 error', async () => {
  const { controller, cleanup } = loadController({
    updateProduct: async () => {
      const error = new Error('Product not found');
      throw error;
    },
  });

  try {
    const req = {
      params: { id: 'product-unknown' },
      body: { name: 'Does not matter' },
      user: { sub: 'sales-1' },
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

    await controller.updateProduct(req, res, next);

    assert.equal(statusCode, 404);
    assert.ok(!jsonPayload.success);
    assert.equal(jsonPayload.message, 'Product not found');
    assert.equal(nextCalled, false);
  } finally {
    cleanup();
  }
});

test('updateProductValidation flags missing fields and invalid id', async () => {
  const { controller, cleanup } = loadController({});

  try {
    const req = {
      params: { id: 'not-a-uuid' },
      body: {},
    };

    const result = await runValidations(controller.updateProductValidation, req);

    assert.equal(result.isEmpty(), false);
    const messages = result.array().map((error) => error.msg);
    assert.ok(messages.includes('Product id must be a valid UUID'));
    assert.ok(messages.includes('At least one field must be provided for update'));
  } finally {
    cleanup();
  }
});

test('authenticate middleware rejects missing authorization header', async () => {
  const authPath = path.resolve(__dirname, '../src/middlewares/auth.js');

  delete require.cache[modelsPath];
  require.cache[modelsPath] = {
    id: modelsPath,
    filename: modelsPath,
    loaded: true,
    exports: {
      User: { findByPk: async () => null },
    },
  };

  delete require.cache[authPath];
  const { authenticate } = require(authPath);

  const req = { headers: {} };
  let statusCode;
  let payload;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      payload = body;
      return this;
    },
  };

  let nextCalled = false;
  const next = () => {
    nextCalled = true;
  };

  try {
    await authenticate(req, res, next);

    assert.equal(statusCode, 401);
    assert.ok(!payload.success);
    assert.equal(payload.message, 'Access token required');
    assert.equal(nextCalled, false);
  } finally {
    delete require.cache[authPath];
    delete require.cache[modelsPath];
  }
});
