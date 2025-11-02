const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const setupModuleMocks = require('./helpers/mock-modules');

const restoreModuleMocks = setupModuleMocks();

const servicePath = path.resolve(__dirname, '../src/services/product.service.js');
const storeServicePath = path.resolve(__dirname, '../src/services/store.service.js');
const modelsPath = path.resolve(__dirname, '../src/models/index.js');

const loadService = (overrides = {}) => {
  delete require.cache[servicePath];
  delete require.cache[storeServicePath];
  delete require.cache[modelsPath];

  const captured = {
    storeFindArgs: [],
    productFindArgs: [],
  };

  const ProductStub = {
    count: async () => {
      if (typeof overrides.countResult === 'number') {
        return overrides.countResult;
      }
      if (typeof overrides.count === 'function') {
        return overrides.count();
      }
      return 0;
    },
    findOne: async (options) => {
      captured.productFindArgs.push(options);
      if (typeof overrides.findOne === 'function') {
        return overrides.findOne(options);
      }
      if (overrides.lastProduct) {
        return overrides.lastProduct;
      }
      return null;
    },
  };

  const StoreStub = {
    findByPk: async (id, options) => {
      captured.storeFindArgs.push({ id, options });
      if (typeof overrides.findByPk === 'function') {
        return overrides.findByPk(id, options);
      }
      if (overrides.storeRecord) {
        return overrides.storeRecord;
      }
      return null;
    },
  };

  require.cache[modelsPath] = {
    id: modelsPath,
    filename: modelsPath,
    loaded: true,
    exports: {
      Product: ProductStub,
      Store: StoreStub,
    },
  };

  const productService = require(servicePath);

  const cleanup = () => {
    delete require.cache[servicePath];
    delete require.cache[storeServicePath];
    delete require.cache[modelsPath];
  };

  return { productService, captured, cleanup };
};

test.after(() => {
  restoreModuleMocks();
});

test('ensureWithinLimit throws when product cap has been reached', async () => {
  const bootstrap = loadService();
  const limitValue = bootstrap.productService.limit;
  bootstrap.cleanup();

  const { productService, cleanup } = loadService({ countResult: limitValue });

  try {
    await assert.rejects(
      () => productService.ensureWithinLimit(),
      (error) => error.code === productService.PRODUCT_LIMIT_ERROR_CODE,
      'Expected PRODUCT_LIMIT_ERROR_CODE when limit is reached',
    );
  } finally {
    cleanup();
  }
});

test('generateNomorKepesertaan locks the store row and increments sequence', async () => {
  const storeRecord = { id: 'store-1', kode_toko: 'TOKO001' };
  const lastProduct = { nomorKepesertaan: 'TOKO001-3' };
  const transaction = { LOCK: { UPDATE: 'FOR UPDATE' } };

  const { productService, captured, cleanup } = loadService({
    storeRecord,
    lastProduct,
  });

  try {
    const result = await productService.generateNomorKepesertaan('store-1', { transaction });

    assert.equal(result.nomorKepesertaan, 'TOKO001-4');
    assert.equal(result.store, storeRecord);
    assert.equal(captured.storeFindArgs.length, 1);
    assert.equal(captured.storeFindArgs[0].options.lock, 'FOR UPDATE');
    assert.equal(captured.productFindArgs.length, 1);
    assert.equal(captured.productFindArgs[0].lock, 'FOR UPDATE');
    assert.equal(captured.productFindArgs[0].where.storeId, 'store-1');
  } finally {
    cleanup();
  }
});
