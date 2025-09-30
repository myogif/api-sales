const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const setupModuleMocks = require('./helpers/mock-modules');

const restoreModuleMocks = setupModuleMocks();

const { Op, fn, col, where } = require('sequelize');

const controllerPath = path.resolve(__dirname, '../src/controllers/manager.controller.js');
const modelsPath = path.resolve(__dirname, '../src/models/index.js');
const servicePath = path.resolve(__dirname, '../src/services/manager.service.js');

const loadController = (overrides = {}) => {
  delete require.cache[controllerPath];
  delete require.cache[modelsPath];
  delete require.cache[servicePath];

  const captured = {};

  const productFindAndCountAll = async (options) => {
    captured.options = options;
    return overrides.findAndCountAllResult || { count: 0, rows: [] };
  };

  const modelsStub = {
    Product: {
      findAndCountAll: productFindAndCountAll,
      findAll: overrides.findAll || (async () => []),
    },
    Store: {},
    User: {},
  };

  require.cache[modelsPath] = {
    id: modelsPath,
    filename: modelsPath,
    loaded: true,
    exports: modelsStub,
  };

  require.cache[servicePath] = {
    id: servicePath,
    filename: servicePath,
    loaded: true,
    exports: overrides.managerService || {},
  };

  const controller = require(controllerPath);

  const cleanup = () => {
    delete require.cache[controllerPath];
    delete require.cache[modelsPath];
    delete require.cache[servicePath];
  };

  return { controller, cleanup, captured };
};

test.after(() => {
  restoreModuleMocks();
});

test('getProducts applies store name filter to store include', async () => {
  const { controller, cleanup, captured } = loadController();

  try {
    const req = {
      query: { store_name: 'Alpha Outlet', page: '1', limit: '5' },
      user: { role: 'MANAGER' },
    };
    const resPayload = {};
    const res = {
      json: (payload) => {
        resPayload.value = payload;
        return res;
      },
    };

    await controller.getProducts(req, res, (err) => { throw err; });

    assert.ok(resPayload.value);
    assert.ok(captured.options, 'findAndCountAll should receive options');
    const storeInclude = captured.options.include.find((inc) => inc.as === 'store');
    assert.ok(storeInclude, 'Store include should be present');
    const expectedMatcher = where(
      fn('LOWER', col('store.name')),
      { [Op.like]: '%alpha outlet%' },
    );

    assert.deepEqual(storeInclude.where, expectedMatcher);
    assert.equal(storeInclude.required, true);
    assert.deepEqual(
      captured.options.where['$store.name$'],
      expectedMatcher,
      'Root where clause should include store name filter',
    );
  } finally {
    cleanup();
  }
});

test('getProducts omits store name filter when not provided', async () => {
  const { controller, cleanup, captured } = loadController();

  try {
    const req = {
      query: { page: '1', limit: '5' },
      user: { role: 'MANAGER' },
    };
    const res = {
      json: () => res,
    };

    await controller.getProducts(req, res, (err) => { throw err; });

    const storeInclude = captured.options.include.find((inc) => inc.as === 'store');
    assert.equal(storeInclude.where, undefined);
    assert.equal(captured.options.where['$store.name$'], undefined);
  } finally {
    cleanup();
  }
});

