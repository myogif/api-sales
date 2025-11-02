const express = require('express');
const request = require('supertest');

jest.mock('../src/models', () => {
  const salesUsers = [];

  const User = {
    count: jest.fn(async ({ where = {} } = {}) => {
      return salesUsers.filter((user) => {
        if (where.role && user.role !== where.role) {
          return false;
        }
        if (where.storeId && user.storeId !== where.storeId) {
          return false;
        }
        return true;
      }).length;
    }),
    create: jest.fn(async (data) => {
      const record = {
        id: data.id || `sales-${salesUsers.length + 1}`,
        ...data,
        toSafeJSON() {
          const { password, ...safeValues } = this;
          return { ...safeValues };
        },
      };

      salesUsers.push(record);
      return record;
    }),
    __reset() {
      salesUsers.length = 0;
      User.count.mockClear();
      User.create.mockClear();
    },
    __records: salesUsers,
  };

  return {
    User,
    Store: {},
    Product: {},
  };
});

const supervisorService = require('../src/services/supervisor.service');
const { User } = require('../src/models');

const buildApp = () => {
  const app = express();
  app.use(express.json());

  app.post('/sales', async (req, res) => {
    try {
      const salesUser = await supervisorService.createSalesUser('supervisor-1', 'store-1', req.body);
      return res.status(201).json({
        status: true,
        message: 'Sales user created successfully',
        data: salesUser,
      });
    } catch (error) {
      if (error.code === supervisorService.SALES_LIMIT_ERROR_CODE) {
        return res.status(422).json({
          status: false,
          message: supervisorService.salesLimitMessage,
          data: null,
        });
      }

      return res.status(500).json({
        status: false,
        message: error.message,
        data: null,
      });
    }
  });

  return app;
};

const basePayload = {
  phone: '081200000000',
  password: 'password123',
  name: 'Sales User',
};

describe('Sales per-store limit enforcement', () => {
  let app;

  beforeEach(() => {
    User.__reset();
    app = buildApp();
  });

  test('allows creating up to 20 sales users for the same store', async () => {
    for (let index = 1; index <= supervisorService.salesLimit; index += 1) {
      const responsePayload = await request(app)
        .post('/sales')
        .send({
          ...basePayload,
          phone: `0812000000${String(index).padStart(2, '0')}`,
          name: `Sales User ${index}`,
        });

      expect(responsePayload.status).toBe(201);
      expect(responsePayload.body).toMatchObject({
        status: true,
        message: 'Sales user created successfully',
      });
    }

    expect(User.count).toHaveBeenCalledTimes(supervisorService.salesLimit);
    expect(User.create).toHaveBeenCalledTimes(supervisorService.salesLimit);
  });

  test('rejects the 21st sales user for the same store with a 422 response', async () => {
    for (let index = 1; index <= supervisorService.salesLimit; index += 1) {
      // eslint-disable-next-line no-await-in-loop
      await request(app)
        .post('/sales')
        .send({
          ...basePayload,
          phone: `0812000000${String(index).padStart(2, '0')}`,
          name: `Sales User ${index}`,
        });
    }

    const responsePayload = await request(app)
      .post('/sales')
      .send({
        ...basePayload,
        phone: '081200000099',
        name: 'Sales User 21',
      });

    expect(responsePayload.status).toBe(422);
    expect(responsePayload.body).toEqual({
      status: false,
      message: 'Jumlah Sales SUdah Mencapai Limit',
      data: null,
    });
  });
});
