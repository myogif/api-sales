const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const setupModuleMocks = require('./helpers/mock-modules');

const restoreModuleMocks = setupModuleMocks();

test.after(() => {
  restoreModuleMocks();
});

const servicePath = path.resolve(__dirname, '../src/services/supervisor.service.js');
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
      User: {},
      Store: {},
      Product: {
        findOne: productFindOne,
      },
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

  const supervisorService = require(servicePath);

  const cleanup = () => {
    delete require.cache[servicePath];
    delete require.cache[modelsPath];
    delete require.cache[loggerPath];
  };

  return { supervisorService, infoLogs, errorLogs, cleanup };
};

test('deleteProduct removes product and logs the action', async () => {
  const destroyed = { value: false };
  const productRecord = {
    id: 'product-123',
    code: 'P-123',
    destroy: async () => {
      destroyed.value = true;
    },
  };

  const { supervisorService, infoLogs, errorLogs, cleanup } = withServiceMocks(async () => productRecord);

  try {
    const result = await supervisorService.deleteProduct('product-123', 'supervisor-1', 'store-1');

    assert.deepEqual(result, { message: 'Product deleted successfully' });
    assert.equal(destroyed.value, true);
    assert.equal(errorLogs.length, 0);
    assert.ok(infoLogs.length > 0);
    assert.equal(infoLogs[0][0], 'Product deleted by supervisor:');
  } finally {
    cleanup();
  }
});

test('deleteProduct throws when product is not found and logs the error', async () => {
  const { supervisorService, errorLogs, cleanup } = withServiceMocks(async () => null);

  try {
    await assert.rejects(
      supervisorService.deleteProduct('missing', 'supervisor-1', 'store-1'),
      /Product not found/,
    );
    assert.ok(errorLogs.length > 0);
    assert.equal(errorLogs[0][0], 'Failed to delete product:');
  } finally {
    cleanup();
  }
});
