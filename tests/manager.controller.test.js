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

test('createSupervisor returns 422 when supervisor limit reached', async () => {
  const limitError = new Error('Supervisor limit reached');
  limitError.code = 'SUPERVISOR_LIMIT_REACHED';

  const { controller, cleanup } = loadController({
    managerService: {
      createSupervisor: async () => { throw limitError; },
      SUPERVISOR_LIMIT_ERROR_CODE: 'SUPERVISOR_LIMIT_REACHED',
      supervisorLimitMessage: 'Jumlah SPV SUdah Mencapai Limit',
    },
  });

  try {
    const req = { body: { name: 'Supervisor Name' } };
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

    await controller.createSupervisor(req, res, next);

    assert.equal(statusCode, 422);
    assert.deepEqual(payload, {
      status: false,
      message: 'Jumlah SPV SUdah Mencapai Limit',
      data: null,
    });
    assert.equal(nextCalled, false);
  } finally {
    cleanup();
  }
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

test('getProducts allows service center role access', async () => {
  const { controller, cleanup, captured } = loadController();

  try {
    const req = {
      query: { page: '1', limit: '5' },
      user: { role: 'SERVICE_CENTER' },
    };
    let responded = false;
    const res = {
      json: (payload) => {
        responded = true;
        return res;
      },
    };

    await controller.getProducts(req, res, (err) => { throw err; });

    assert.equal(responded, true);
    assert.ok(captured.options, 'findAndCountAll should be invoked for service center role');
    assert.equal(captured.options.where.id, undefined);
  } finally {
    cleanup();
  }
});

