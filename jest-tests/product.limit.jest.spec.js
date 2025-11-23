const express = require('express');
const request = require('supertest');

jest.mock('../src/models', () => {
  const { v4: uuidv4 } = require('uuid');

  const products = [];
  const stores = new Map();
  const sequences = new Map();
  let forcedCount = null;
  let sequenceId = 1;

  class SequenceInstance {
    constructor(storeId, nextNumber = 1) {
      this.id = sequenceId;
      sequenceId += 1;
      this.storeId = storeId;
      this.nextNumber = nextNumber;
    }

    async increment(field, { by = 1 } = {}) {
      if (field === 'nextNumber' || field === 'next_number') {
        this.nextNumber += by;
        sequences.set(this.storeId, this);
      }
      return this;
    }

    get dataValues() {
      return {
        id: this.id,
        store_id: this.storeId,
        next_number: this.nextNumber,
      };
    }

    toJSON() {
      return {
        id: this.id,
        storeId: this.storeId,
        nextNumber: this.nextNumber,
      };
    }
  }

  const Product = {
    count: jest.fn(async () => {
      if (forcedCount !== null) {
        return forcedCount;
      }
      return products.length;
    }),
    create: jest.fn(async (data) => {
      if (products.some((product) => product.nomorKepesertaan === data.nomorKepesertaan)) {
        const error = new Error('nomor_kepesertaan must be unique');
        error.name = 'SequelizeUniqueConstraintError';
        throw error;
      }

      const record = {
        id: data.id || uuidv4(),
        ...data,
      };
      products.push(record);
      return record;
    }),
    findOne: jest.fn(async () => null),
    __reset() {
      products.length = 0;
      forcedCount = null;
      Product.count.mockClear();
      Product.create.mockClear();
      Product.findOne.mockClear();
    },
    __setCount(value) {
      forcedCount = value;
    },
    __records: products,
  };

  const Store = {
    findByPk: jest.fn(async (id) => {
      return stores.get(id) || null;
    }),
    rawAttributes: {},
    __reset() {
      stores.clear();
      Store.findByPk.mockClear();
    },
    __set(store) {
      stores.set(store.id, { ...store });
    },
  };

  const StoreProductSequence = {
    findOne: jest.fn(async ({ where: { storeId } }) => {
      return sequences.get(storeId) || null;
    }),
    create: jest.fn(async ({ storeId, nextNumber = 1 }) => {
      const instance = new SequenceInstance(storeId, nextNumber);
      sequences.set(storeId, instance);
      return instance;
    }),
    __reset() {
      sequences.clear();
      sequenceId = 1;
      StoreProductSequence.findOne.mockClear();
      StoreProductSequence.create.mockClear();
    },
  };

  const sequelize = {
    transaction: jest.fn(async (callback) => {
      const transaction = {
        LOCK: {
          UPDATE: Symbol('UPDATE'),
          SHARE: Symbol('SHARE'),
          KEY_SHARE: Symbol('KEY_SHARE'),
        },
      };
      return callback(transaction);
    }),
  };

  return {
    Product,
    Store,
    StoreProductSequence,
    sequelize,
    Sequelize: require('sequelize'),
  };
});

const productService = require('../src/services/product.service');
const salesService = require('../src/services/sales.service');
const {
  createProduct,
} = require('../src/controllers/sales.controller');
const {
  Product,
  Store,
  StoreProductSequence,
  sequelize,
} = require('../src/models');

const buildApp = () => {
  const app = express();
  app.use(express.json());

  app.post('/products', async (req, res, next) => {
    req.user = {
      sub: 'sales-user-1',
      store_id: 'store-1',
    };
    next();
  }, createProduct);

  return app;
};

const basePayload = {
  name: 'Membership Premium',
  tipe: 'DEFAULT',
  code: 'MBR-001',
  price: 1000000,
  persen: 10,
  customer_phone: '08123456789',
};

describe('Product creation limits and numbering', () => {
  let app;

  beforeEach(() => {
    Product.__reset();
    Store.__reset();
    StoreProductSequence.__reset();
    sequelize.transaction.mockClear();

    Store.__set({
      id: 'store-1',
      kode_toko: 'MS',
    });

    app = buildApp();
  });

  test('returns 201 when creating a product before reaching the cap', async () => {
    const responsePayload = await request(app)
      .post('/products')
      .send(basePayload);

    expect(responsePayload.status).toBe(201);
    expect(responsePayload.body).toMatchObject({
      success: true,
      message: 'Product created successfully',
    });
    expect(Product.create).toHaveBeenCalledTimes(1);
    expect(Product.__records[0].nomorKepesertaan).toBe('MS-789');
  });

  test('returns 422 with the exact message when the global cap is reached', async () => {
    Product.__setCount(productService.limit);

    const responsePayload = await request(app)
      .post('/products')
      .send(basePayload);

    expect(responsePayload.status).toBe(422);
    expect(responsePayload.body).toEqual({
      status: false,
      message: productService.limitReachedMessage,
      data: null,
    });
    expect(Product.create).not.toHaveBeenCalled();
  });

  test('generates sequential nomor_kepesertaan per store under concurrent requests', async () => {
    const [firstProduct, secondProduct] = await Promise.all([
      salesService.createProduct('sales-user-1', 'store-1', {
        ...basePayload,
        code: 'MBR-001',
        customer_phone: '08123456789',
      }),
      salesService.createProduct('sales-user-2', 'store-1', {
        ...basePayload,
        code: 'MBR-002',
        customer_phone: '08567890123',
      }),
    ]);

    const nomorSet = new Set([firstProduct.nomorKepesertaan, secondProduct.nomorKepesertaan]);
    expect(nomorSet).toEqual(new Set(['MS-789', 'MS-123']));
    expect(Product.__records).toHaveLength(2);
  });
});
