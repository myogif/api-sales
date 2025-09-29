const test = require('node:test');
const assert = require('node:assert/strict');
const setupModuleMocks = require('./helpers/mock-modules');

const restoreModuleMocks = setupModuleMocks();

const { Op } = require('sequelize');
const { buildProductFilters } = require('../src/utils/filters');

const baseUser = { role: 'MANAGER' };

test.after(() => {
  restoreModuleMocks();
});

test('buildProductFilters adds store name condition when provided', () => {
  const filters = buildProductFilters({ store_name: ' Central ' }, baseUser);

  assert.deepEqual(filters['$store.name$'], { [Op.iLike]: '%Central%' });
});

test('buildProductFilters ignores blank store name', () => {
  const filters = buildProductFilters({ store_name: '   ' }, baseUser);

  assert.equal(filters['$store.name$'], undefined);
});
