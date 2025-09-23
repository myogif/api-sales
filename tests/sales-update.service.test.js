const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const setupModuleMocks = require('./helpers/mock-modules');

const restoreModuleMocks = setupModuleMocks();

test.after(() => {
  restoreModuleMocks();
});

const servicePath = path.resolve(__dirname, '../src/services/sales.service.js');
const modelsPath = path.resolve(__dirname, '../src/models/index.js');
const loggerPath = path.resolve(__dirname, '../src/utils/logger.js');

const withServiceMocks = (productFindOne) => {
  delete require.cache[servicePath];
  delete require.cache[modelsPath];
  delete require.cache[loggerPath];

  const infoLogs = [];
  const errorLogs = [];

  require.cache[modelsPath] = {
    id: modelsPath,
    filename: modelsPath,
    loaded: true,
    exports: {
      Product: {
        findOne: productFindOne,
      },
      Store: {},
      User: {},
    },
  };

  require.cache[loggerPath] = {
    id: loggerPath,
    filename: loggerPath,
    loaded: true,
    exports: {
      info: (...args) => infoLogs.push(args),
      error: (...args) => errorLogs.push(args),
    },
  };

  const salesService = require(servicePath);

  const cleanup = () => {
    delete require.cache[servicePath];
    delete require.cache[modelsPath];
    delete require.cache[loggerPath];
  };

  return { salesService, infoLogs, errorLogs, cleanup };
};

test('updateProduct applies allowed updates and logs the action', async () => {
  const saved = { value: false };
  const productRecord = {
    id: 'product-123',
    creatorId: 'sales-1',
    code: 'P-001',
    name: 'Old Name',
    price: 100,
    notes: 'Initial note',
    save: async () => {
      saved.value = true;
    },
  };

  const { salesService, infoLogs, errorLogs, cleanup } = withServiceMocks(async () => productRecord);

  try {
    const result = await salesService.updateProduct('product-123', 'sales-1', {
      name: 'Updated Name',
      price: 150,
      notes: 'Updated note',
      unknownField: 'ignored',
    });

    assert.equal(result, productRecord);
    assert.equal(productRecord.name, 'Updated Name');
    assert.equal(productRecord.price, 150);
    assert.equal(productRecord.notes, 'Updated note');
    assert.equal(productRecord.unknownField, undefined);
    assert.ok(saved.value, 'product.save should be called');
    assert.equal(errorLogs.length, 0);
    assert.ok(infoLogs.length > 0);
    assert.equal(infoLogs[0][0], 'Product updated by sales user:');
  } finally {
    cleanup();
  }
});

test('updateProduct throws when product is not found and logs the error', async () => {
  const { salesService, errorLogs, cleanup } = withServiceMocks(async () => null);

  try {
    await assert.rejects(
      salesService.updateProduct('missing', 'sales-1', { name: 'Nope' }),
      /Product not found/,
    );
    assert.ok(errorLogs.length > 0);
    assert.equal(errorLogs[0][0], 'Failed to update product:');
  } finally {
    cleanup();
  }
});
