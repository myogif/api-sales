const test = require('node:test');
const assert = require('node:assert/strict');
const setupModuleMocks = require('./helpers/mock-modules');

const restoreModuleMocks = setupModuleMocks();

const ExcelJS = require('exceljs');
const { streamProductsXlsx } = require('../src/utils/excel');

test.after(() => {
  restoreModuleMocks();
});

test('streamProductsXlsx defines expected columns including Tanggal Berakhir Garansi', async () => {
  const res = {
    setHeader: () => {},
    end: () => {},
  };

  await streamProductsXlsx(res, [], 'products.xlsx');

  const workbook = ExcelJS.__getLastWorkbook();
  assert.ok(workbook, 'Workbook instance should be captured');

  const worksheet = workbook.worksheets[0];
  assert.ok(worksheet, 'Worksheet should be created');

  const warrantyEndCol = worksheet.columns.find((col) => col.key === 'warrantyEnd');
  assert.ok(warrantyEndCol, 'warrantyEnd column should be defined');
  assert.equal(warrantyEndCol.header, 'Tanggal Berakhir Garansi');
  assert.equal(warrantyEndCol.width, 20);
});

test('streamProductsXlsx uses supervisor phone number for storePhone column and calculates warrantyEnd', async () => {
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
      warrantyMonths: 6,
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
  assert.ok(firstRow.warrantyEnd.startsWith('01-07-2024'));
});

test('streamProductsXlsx falls back to store phone when supervisor phone is missing and handles missing warrantyMonths', async () => {
  let headersSet = {};
  let ended = false;
  const res = {
    setHeader: (key, val) => {
      headersSet[key] = val;
    },
    end: () => {
      ended = true;
    },
  };

  const products = [
    {
      name: 'Product Without Supervisor Phone',
      tipe: 'Silver',
      store: {
        name: 'Branch Store',
        phone: '0877777777',
      },
      creator: {
        name: 'Sales Rep',
        phone: '0812345678',
      },
      createdAt: '2024-03-15T10:30:00.000Z',
    },
    {
      name: 'Product With Invalid Date and No Phone',
      tipe: 'Bronze',
      warrantyMonths: 'invalid',
      createdAt: 'invalid-date',
    },
  ];

  await streamProductsXlsx(res, products, 'custom_export.xlsx');

  assert.equal(headersSet['Content-Type'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  assert.equal(headersSet['Content-Disposition'], 'attachment; filename="custom_export.xlsx"');
  assert.equal(ended, true);

  const workbook = ExcelJS.__getLastWorkbook();
  const worksheet = workbook.worksheets[0];
  assert.equal(worksheet.rows.length, 2);

  const [row1, row2] = worksheet.rows;
  assert.equal(row1.storePhone, '0877777777');
  assert.equal(row1.warrantyEnd, '');

  assert.equal(row2.storePhone, '');
  assert.equal(row2.warrantyEnd, '');
});
