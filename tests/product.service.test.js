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
    sequenceFindArgs: [],
    sequenceCreateArgs: [],
    sequenceIncrementArgs: [],
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

  const wrapSequenceRecord = (record) => {
    if (!record) {
      return record;
    }

    const originalIncrement = typeof record.increment === 'function'
      ? record.increment.bind(record)
      : null;

    record.increment = async (field, options = {}) => {
      captured.sequenceIncrementArgs.push({ field, options });
      if (originalIncrement) {
        return originalIncrement(field, options);
      }
      if (typeof record.nextNumber === 'number') {
        record.nextNumber += options.by ?? 1;
      }
      return undefined;
    };

    return record;
  };

  const StoreProductSequenceStub = {
    findOne: async (options) => {
      captured.sequenceFindArgs.push(options);
      if (typeof overrides.sequenceFindOne === 'function') {
        return wrapSequenceRecord(await overrides.sequenceFindOne(options));
      }
      return wrapSequenceRecord(overrides.sequenceRecord || null);
    },
    create: async (values, options) => {
      captured.sequenceCreateArgs.push({ values, options });
      if (typeof overrides.sequenceCreate === 'function') {
        return wrapSequenceRecord(await overrides.sequenceCreate(values, options));
      }
      return wrapSequenceRecord({
        ...values,
        nextNumber: values.nextNumber ?? 1,
      });
    },
  };

  require.cache[modelsPath] = {
    id: modelsPath,
    filename: modelsPath,
    loaded: true,
    exports: {
      Product: ProductStub,
      Store: StoreStub,
      StoreProductSequence: StoreProductSequenceStub,
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
  const sequenceRecord = { storeId: 'store-1', nextNumber: 4 };
  const transaction = { LOCK: { UPDATE: 'FOR UPDATE' } };

  const { productService, captured, cleanup } = loadService({
    storeRecord,
    sequenceRecord,
  });

  try {
    const result = await productService.generateNomorKepesertaan('store-1', { transaction });

    assert.equal(result.nomorKepesertaan, 'TOKO001-4');
    assert.equal(result.store, storeRecord);
    assert.equal(captured.storeFindArgs.length, 1);
    assert.equal(captured.storeFindArgs[0].options.lock, 'FOR UPDATE');
    assert.equal(captured.sequenceFindArgs.length, 1);
    assert.equal(captured.sequenceFindArgs[0].lock, 'FOR UPDATE');
    assert.equal(captured.sequenceFindArgs[0].where.storeId, 'store-1');
    assert.equal(captured.sequenceCreateArgs.length, 0);
    assert.equal(captured.sequenceIncrementArgs.length, 1);
    assert.deepEqual(captured.sequenceIncrementArgs[0], {
      field: 'nextNumber',
      options: { by: 1, transaction },
    });
  } finally {
    cleanup();
  }
});
