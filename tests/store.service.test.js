const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const setupModuleMocks = require('./helpers/mock-modules');

const restoreModuleMocks = setupModuleMocks();

const servicePath = path.resolve(__dirname, '../src/services/store.service.js');
const modelsPath = path.resolve(__dirname, '../src/models/index.js');

const loadService = (overrides = {}) => {
  delete require.cache[servicePath];
  delete require.cache[modelsPath];

  const captured = {};

  const StoreStub = {
    count: async () => (typeof overrides.countResult === 'number' ? overrides.countResult : 0),
    create: async (data) => {
      captured.createPayload = data;
      return overrides.createResult || { ...data, id: data.id || 'store-id' };
    },
    findByPk: async (id) => {
      if (typeof overrides.findByPk === 'function') {
        return overrides.findByPk(id);
      }
      if (overrides.storeInstance) {
        return overrides.storeInstance;
      }
      return null;
    },
  };

  const ProductStub = {
    count: async () => (typeof overrides.productCountResult === 'number' ? overrides.productCountResult : 0),
  };

  const UserStub = {
    count: async () => (typeof overrides.supervisorCountResult === 'number' ? overrides.supervisorCountResult : 0),
  };

  require.cache[modelsPath] = {
    id: modelsPath,
    filename: modelsPath,
    loaded: true,
    exports: {
      Store: { ...StoreStub, ...(overrides.store || {}) },
      Product: { ...ProductStub, ...(overrides.product || {}) },
      User: { ...UserStub, ...(overrides.user || {}) },
    },
  };

  const storeService = require(servicePath);

  const cleanup = () => {
    delete require.cache[servicePath];
    delete require.cache[modelsPath];
  };

  return { storeService, captured, cleanup };
};

test.after(() => {
  restoreModuleMocks();
});

test('createStore throws an error when store limit is reached', async () => {
  const { storeService, cleanup } = loadService({ countResult: 300 });

  try {
    await assert.rejects(
      () => storeService.createStore({ name: 'Alpha', kode_toko: 'TOKO999' }),
      (error) => error.code === storeService.STORE_LIMIT_ERROR_CODE,
      'Expected STORE_LIMIT_ERROR_CODE when reaching the store limit',
    );
  } finally {
    cleanup();
  }
});

test('createStore and updateStore sanitize kode_toko values', async () => {
  let savedStore;
  const storeRecord = {
    id: 'store-1',
    kode_toko: 'TOKO001',
    name: 'Existing Store',
    save: async function save() {
      savedStore = { kode_toko: this.kode_toko, name: this.name };
      return this;
    },
  };

  const { storeService, captured, cleanup } = loadService({
    countResult: 10,
    storeInstance: storeRecord,
  });

  try {
    await storeService.createStore({ id: 'store-2', name: 'Alpha', kode_toko: 'alpha1' });
    assert.equal(captured.createPayload.kode_toko, 'ALPHA1');

    await storeService.updateStore('store-1', { kode_toko: 'beta22', name: '  Beta Store  ' });
    assert.ok(savedStore, 'Store save should be invoked');
    assert.equal(savedStore.kode_toko, 'BETA22');
    assert.equal(savedStore.name, 'Beta Store');
  } finally {
    cleanup();
  }
});

test('deleteStore throws an error when a supervisor is assigned', async () => {
  const storeRecord = {
    id: 'store-1',
    destroy: async () => {
      throw new Error('destroy should not be called when supervisor exists');
    },
  };

  const { storeService, cleanup } = loadService({
    storeInstance: storeRecord,
    supervisorCountResult: 1,
    productCountResult: 0,
  });

  try {
    await assert.rejects(
      () => storeService.deleteStore('store-1'),
      (error) => error.code === storeService.STORE_HAS_SUPERVISOR_ERROR_CODE,
      'Expected STORE_HAS_SUPERVISOR_ERROR_CODE when supervisor exists',
    );
  } finally {
    cleanup();
  }
});
