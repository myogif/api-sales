const test = require('node:test');
const assert = require('node:assert/strict');
const setupModuleMocks = require('./helpers/mock-modules');

const restoreModuleMocks = setupModuleMocks();

const { Op, fn, col, where } = require('sequelize');
const { buildProductFilters } = require('../src/utils/filters');

const baseUser = { role: 'MANAGER' };

test.after(() => {
  restoreModuleMocks();
});

test('buildProductFilters adds store name condition when provided', () => {
  const filters = buildProductFilters({ store_name: ' Central ' }, baseUser);

  const expectedMatcher = where(
    fn('LOWER', col('store.name')),
    { [Op.like]: '%central%' },
  );

  assert.deepEqual(filters['$store.name$'], expectedMatcher);
});

test('buildProductFilters ignores blank store name', () => {
  const filters = buildProductFilters({ store_name: '   ' }, baseUser);

  assert.equal(filters['$store.name$'], undefined);
});

test('buildProductFilters creates case-insensitive search for q parameter', () => {
  const filters = buildProductFilters({ q: 'TeSt' }, baseUser);

  assert.ok(Array.isArray(filters[Op.or]));
  const [nameMatcher] = filters[Op.or];
  const expectedMatcher = where(
    fn('LOWER', col('name')),
    { [Op.like]: '%test%' },
  );

  assert.deepEqual(nameMatcher, expectedMatcher);
});
