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

test('buildProductFilters normalizes created_at_from to start of day', () => {
  const filters = buildProductFilters({ created_at_from: '2024-01-15' }, baseUser);

  const fromFilter = filters.createdAt[Op.gte];

  assert.ok(fromFilter instanceof Date);
  assert.equal(fromFilter.getHours(), 0);
  assert.equal(fromFilter.getMinutes(), 0);
  assert.equal(fromFilter.getSeconds(), 1);
  assert.equal(fromFilter.getMilliseconds(), 0);
});

test('buildProductFilters normalizes created_at_to to end of day', () => {
  const filters = buildProductFilters({ created_at_to: '2024-01-15' }, baseUser);

  const toFilter = filters.createdAt[Op.lte];

  assert.ok(toFilter instanceof Date);
  assert.equal(toFilter.getHours(), 23);
  assert.equal(toFilter.getMinutes(), 59);
  assert.equal(toFilter.getSeconds(), 59);
  assert.equal(toFilter.getMilliseconds(), 999);
});

test('buildProductFilters allows service center to access all products', () => {
  const filters = buildProductFilters({}, { role: 'SERVICE_CENTER' });

  assert.equal(filters.storeId, undefined);
  assert.equal(filters.id, undefined);
});
