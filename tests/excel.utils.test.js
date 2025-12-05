const test = require('node:test');
const assert = require('node:assert/strict');
const setupModuleMocks = require('./helpers/mock-modules');

const restoreModuleMocks = setupModuleMocks();

const ExcelJS = require('exceljs');
const { streamProductsXlsx } = require('../src/utils/excel');

test.after(() => {
  restoreModuleMocks();
});

test('streamProductsXlsx uses supervisor phone number for storePhone column', async () => {
  const res = {
    setHeader: () => {},
    end: () => {},
  };

  const products = [
    {
      name: 'Sample Product',
      tipe: 'Gold',
      code: 'PRD-001',
      price: 10000,
      priceWarranty: 15000,
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      store: {
        name: 'Main Store',
        phone: '0800000000',
      },
      creator: {
        name: 'Sales User',
        phone: '0811111111',
        supervisor: {
          id: 'supervisor-1',
          name: 'Supervisor User',
          phone: '0822222222',
        },
      },
    },
  ];

  await streamProductsXlsx(res, products, 'products.xlsx');

  const workbook = ExcelJS.__getLastWorkbook();
  assert.ok(workbook, 'Workbook instance should be captured');

  const worksheet = workbook.worksheets[0];
  assert.ok(worksheet, 'Worksheet should be created');

  assert.equal(worksheet.rows.length, 1);
  const [firstRow] = worksheet.rows;
  assert.equal(firstRow.tipe, 'Gold');
  assert.equal(firstRow.storePhone, '0822222222');
});
