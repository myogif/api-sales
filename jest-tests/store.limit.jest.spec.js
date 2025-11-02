const express = require('express');

jest.mock('supertest', () => {
  const http = require('node:http');

  return (app) => ({
    post(path) {
      return {
        send(payload) {
          return new Promise((resolve, reject) => {
            const server = app.listen(0, () => {
              const { port } = server.address();
              const requestPayload = JSON.stringify(payload);

              const options = {
                method: 'POST',
                hostname: '127.0.0.1',
                port,
                path,
                headers: {
                  'content-type': 'application/json',
                  'content-length': Buffer.byteLength(requestPayload),
                },
              };

              const req = http.request(options, (res) => {
                const chunks = [];
                res.on('data', (chunk) => chunks.push(chunk));
                res.on('end', () => {
                  server.close(() => {
                    const body = Buffer.concat(chunks).toString();
                    try {
                      resolve({
                        status: res.statusCode,
                        body: body ? JSON.parse(body) : undefined,
                      });
                    } catch (parseError) {
                      reject(parseError);
                    }
                  });
                });
              });

              req.on('error', (error) => {
                server.close(() => reject(error));
              });

              req.write(requestPayload);
              req.end();
            });
          });
        },
      };
    },
  });
});

const request = require('supertest');

jest.mock('../src/models', () => {
  const stores = [];
  const count = jest.fn(async () => stores.length);
  const create = jest.fn(async (data) => {
    const record = { ...data };
    if (!record.id) {
      record.id = `store-${stores.length + 1}`;
    }
    stores.push(record);
    return record;
  });
  const findByPk = jest.fn(async (id) => stores.find((store) => store.id === id) || null);

  return {
    Store: {
      count,
      create,
      findByPk,
      rawAttributes: {},
      __reset() {
        stores.length = 0;
        count.mockClear();
        create.mockClear();
        findByPk.mockClear();
      },
    },
  };
});

const storeService = require('../src/services/store.service');
const { Store } = require('../src/models');

const buildApp = () => {
  const app = express();
  app.use(express.json());

  app.post('/stores', async (req, res) => {
    try {
      const store = await storeService.createStore(req.body);
      return res.status(201).json({
        status: true,
        message: 'Store created successfully',
        data: {
          id: store.id,
          kode_toko: store.kode_toko,
          name: store.name,
        },
      });
    } catch (error) {
      if (error.code === storeService.STORE_LIMIT_ERROR_CODE) {
        return res.status(422).json({
          status: false,
          message: storeService.limitReachedMessage,
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

describe('Store creation limit', () => {
  let app;

  beforeEach(() => {
    Store.__reset();
    app = buildApp();
  });

  test('allows creating up to 300 stores', async () => {
    for (let index = 1; index <= 300; index += 1) {
      const response = await request(app)
        .post('/stores')
        .send({
          id: `store-${index}`,
          name: `Store ${index}`,
          kode_toko: `TOKO${String(index).padStart(3, '0')}`,
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        status: true,
        data: {
          id: `store-${index}`,
          kode_toko: `TOKO${String(index).padStart(3, '0')}`,
        },
      });
    }
  });

  test('rejects the 301st store with a 422 response', async () => {
    for (let index = 1; index <= 300; index += 1) {
      // eslint-disable-next-line no-await-in-loop
      await request(app)
        .post('/stores')
        .send({
          id: `store-${index}`,
          name: `Store ${index}`,
          kode_toko: `TOKO${String(index).padStart(3, '0')}`,
        });
    }

    const response = await request(app)
      .post('/stores')
      .send({
        id: 'store-301',
        name: 'Store 301',
        kode_toko: 'TOKO301',
      });

    expect(response.status).toBe(422);
    expect(response.body).toEqual({
      status: false,
      message: 'Pembuatan Toko SUdah Mencapai Limit',
      data: null,
    });
  });
});
