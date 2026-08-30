const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const setupModuleMocks = require('./helpers/mock-modules');

const restoreModuleMocks = setupModuleMocks();

const servicePath = path.resolve(__dirname, '../src/services/manager.service.js');
const modelsPath = path.resolve(__dirname, '../src/models/index.js');
const loggerPath = path.resolve(__dirname, '../src/utils/logger.js');

const loadService = (overrides = {}) => {
  delete require.cache[servicePath];
  delete require.cache[modelsPath];
  delete require.cache[loggerPath];

  const monthExpression = Symbol('monthExpression');
  const captured = {};

  const sequelizeStub = {
    fn: (...args) => (args[0] === 'DATE_FORMAT' ? monthExpression : { fn: args }),
    col: (value) => ({ col: value }),
    transaction: async () => ({
      commit: async () => {},
      rollback: async () => {},
    }),
  };

  const ProductStub = {
    name: 'Product',
    rawAttributes: { createdAt: { field: 'createdAt' } },
    findAll: async (options) => {
      captured.options = options;
      return overrides.findAllResult || [
        { month: '2023-01-01T00:00:00.000Z', productCount: '3' },
        { month: '2023-02-01T00:00:00.000Z', productCount: '1' },
      ];
    },
  };

  require.cache[loggerPath] = {
    id: loggerPath,
    filename: loggerPath,
    loaded: true,
    exports: {
      info: () => {},
      error: () => {},
      warn: () => {},
    },
  };

  require.cache[modelsPath] = {
    id: modelsPath,
    filename: modelsPath,
    loaded: true,
    exports: {
      Product: { ...ProductStub, ...(overrides.product || {}) },
      User: { ...(overrides.user || {}) },
      Store: { ...(overrides.store || {}) },
      sequelize: overrides.sequelize || sequelizeStub,
    },
  };

  const managerService = require(servicePath);

  const cleanup = () => {
    delete require.cache[servicePath];
    delete require.cache[modelsPath];
    delete require.cache[loggerPath];
  };

  return { managerService, captured, monthExpression, cleanup };
};

const { Op } = require('sequelize');

test.after(() => {
  restoreModuleMocks();
});

test('getDashboard returns topTenStores sorted by productCount from DB, not in-memory', async () => {
  const storeFindAllResult = [
    { id: 'store-a', name: 'Toko A', address: 'Jl. A', productCount: '15' },
    { id: 'store-b', name: 'Toko B', address: 'Jl. B', productCount: '8' },
    { id: 'store-c', name: 'Toko C', address: 'Jl. C', productCount: '0' },
  ];

  let storeFindAllOptions;

  const { managerService, cleanup } = loadService({
    store: {
      count: async () => 3,
      findAll: async (options) => {
        storeFindAllOptions = options;
        return storeFindAllResult;
      },
    },
    user: {
      count: async () => 2,
    },
    product: {
      name: 'Product',
      rawAttributes: { createdAt: { field: 'createdAt' } },
      count: async () => 23,
      findAll: async () => [],
    },
    sequelize: {
      fn: (...args) => ({ fn: args }),
      col: (value) => ({ col: value }),
      literal: (value) => ({ literal: value }),
      transaction: async () => ({ commit: async () => {}, rollback: async () => {} }),
    },
  });

  try {
    const result = await managerService.getDashboard();

    // topTenStores harus datang langsung dari query DB (sudah terurut dari DB)
    assert.equal(result.topTenStores.length, 3);
    assert.equal(result.topTenStores[0].storeId, 'store-a');
    assert.equal(result.topTenStores[0].productCount, 15);
    assert.equal(result.topTenStores[1].storeId, 'store-b');
    assert.equal(result.topTenStores[1].productCount, 8);
    assert.equal(result.topTenStores[2].productCount, 0);

    // productCount harus berupa Number, bukan string
    assert.equal(typeof result.topTenStores[0].productCount, 'number');

    // Pastikan query DB memakai GROUP BY + ORDER + LIMIT (bukan sort di JS)
    assert.ok(storeFindAllOptions.group, 'harus ada GROUP BY di query');
    assert.ok(storeFindAllOptions.order, 'harus ada ORDER BY di query');
    assert.equal(storeFindAllOptions.limit, 10, 'limit 10 harus ada di query DB');

    // Tidak boleh ada attributes products yang mengambil rows (harus [])
    const productsInclude = storeFindAllOptions.include.find((i) => i.as === 'products');
    assert.ok(productsInclude, 'include products harus ada');
    assert.deepEqual(productsInclude.attributes, [], 'attributes products harus kosong ([] bukan [\'id\'])');

    assert.equal(result.totalProducts, 23);
    assert.equal(result.totalStores, 3);
  } finally {
    cleanup();
  }
});

test('getMonthlyProductSummary includes inactive products in counts', async () => {
  const { managerService, captured, cleanup } = loadService();

  try {
    const summary = await managerService.getMonthlyProductSummary(2023);

    assert.equal(summary.year, 2023);
    assert.ok(Array.isArray(summary.monthlyProducts));
    const january = summary.monthlyProducts.find((entry) => entry.month === 'January');
    assert.ok(january, 'January entry should exist');
    assert.equal(january.total, 3, 'January total should reflect active and inactive products');

    const march = summary.monthlyProducts.find((entry) => entry.month === 'March');
    assert.ok(march, 'March entry should exist');
    assert.equal(march.total, 0, 'Months without products should return zero total');

    assert.ok(captured.options, 'findAll should be called with options');
    assert.ok(captured.options.where, 'where clause should be provided');
    assert.equal(
      Object.prototype.hasOwnProperty.call(captured.options.where, 'isActive'),
      false,
      'isActive filter should not be present',
    );

    const createdAtFilter = captured.options.where.createdAt;
    assert.ok(createdAtFilter, 'createdAt filter should be present');
    assert.ok(createdAtFilter[Op.gte] instanceof Date, 'gte bound should be a date');
    assert.ok(createdAtFilter[Op.lt] instanceof Date, 'lt bound should be a date');
  } finally {
    cleanup();
  }
});

test('createSupervisor enforces per-store supervisor limit', async () => {
  let rollbackCalled = false;
  let createCalled = false;
  let countOptions;
  const fakeTransaction = {
    commit: async () => {
      throw new Error('Commit should not be called when limit is reached');
    },
    rollback: async () => {
      rollbackCalled = true;
    },
  };

  const { managerService, cleanup } = loadService({
    user: {
      count: async (options) => {
        countOptions = options;
        return 2;
      },
      create: async () => {
        createCalled = true;
        throw new Error('Should not create supervisor when limit is reached');
      },
    },
    store: {
      findByPk: async () => ({ id: 'store-1' }),
    },
    sequelize: {
      fn: (...args) => (args[0] === 'DATE_FORMAT' ? Symbol('monthExpression') : { fn: args }),
      col: (value) => ({ col: value }),
      transaction: async () => fakeTransaction,
    },
  });

  try {
    await assert.rejects(
      managerService.createSupervisor({ storeId: 'store-1', name: 'Supervisor', phone: '0800000000', password: 'secret123' }),
      (error) => {
        assert.equal(error.code, managerService.SUPERVISOR_LIMIT_ERROR_CODE);
        return true;
      },
    );

    assert.ok(rollbackCalled, 'transaction rollback should be invoked');
    assert.equal(createCalled, false, 'supervisor should not be created when limit is reached');
    assert.deepEqual(countOptions.where, { role: 'SUPERVISOR', storeId: 'store-1' });
    assert.equal(countOptions.transaction, fakeTransaction);
  } finally {
    cleanup();
  }
});

