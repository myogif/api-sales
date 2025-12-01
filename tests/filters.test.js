const test = require('node:test');
const assert = require('node:assert/strict');
const setupModuleMocks = require('./helpers/mock-modules');

const restoreModuleMocks = setupModuleMocks();

const { Op, fn, col, where } = require('sequelize');
const {
  buildProductFilters,
  buildSupervisorFilters,
  buildSalesFilters,
  buildStoreFilters,
} = require('../src/utils/filters');

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

  assert.ok(Array.isArray(filters[Op.and]));
  assert.deepEqual(filters[Op.and][0], expectedMatcher);
});

test('buildProductFilters ignores blank store name', () => {
  const filters = buildProductFilters({ store_name: '   ' }, baseUser);

  assert.equal(filters[Op.and], undefined);
});

test('buildProductFilters creates case-insensitive search for q parameter', () => {
  const filters = buildProductFilters({ q: 'TeSt' }, baseUser);

  assert.ok(Array.isArray(filters[Op.or]));
  const [nameMatcher] = filters[Op.or];
  const expectedMatcher = where(
    fn('LOWER', col('Product.name')),
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

test('buildProductFilters normalizes role casing before applying restrictions', () => {
  const filters = buildProductFilters({}, { role: 'manager' });

  assert.equal(filters.id, undefined);
});

test('buildProductFilters does not force store filter when user store is missing', () => {
  const filters = buildProductFilters({}, { role: 'SUPERVISOR', store_id: null });

  assert.equal(filters.storeId, undefined);
});

test('buildProductFilters keeps sales results unrestricted when store is missing and mine flag absent', () => {
  const filters = buildProductFilters({}, { role: 'SALES', store_id: undefined });

  assert.equal(filters.storeId, undefined);
});

test('buildSupervisorFilters applies q to supervisor and store fields', () => {
  const filters = buildSupervisorFilters({ q: 'Central' }, baseUser);

  const [nameMatcher, phoneMatcher, storeMatcher] = filters[Op.or];

  const expectedNameMatcher = where(
    fn('LOWER', col('User.name')),
    { [Op.like]: '%central%' },
  );

  const expectedPhoneMatcher = where(
    fn('LOWER', col('User.phone')),
    { [Op.like]: '%central%' },
  );

  const expectedStoreMatcher = where(
    fn('LOWER', col('store.name')),
    { [Op.like]: '%central%' },
  );

  assert.equal(filters.role, 'SUPERVISOR');
  assert.deepEqual(nameMatcher, expectedNameMatcher);
  assert.deepEqual(phoneMatcher, expectedPhoneMatcher);
  assert.deepEqual(storeMatcher, expectedStoreMatcher);
});

test('buildSupervisorFilters limits supervisors to their store when requester is supervisor', () => {
  const filters = buildSupervisorFilters({}, { role: 'SUPERVISOR', store_id: 'store-123' });

  assert.equal(filters.storeId, 'store-123');
});

test('buildSalesFilters builds case-insensitive matchers for q', () => {
  const filters = buildSalesFilters({ q: 'Agent' }, baseUser);

  const [nameMatcher, phoneMatcher, storeMatcher] = filters[Op.or];

  const expectedNameMatcher = where(
    fn('LOWER', col('User.name')),
    { [Op.like]: '%agent%' },
  );

  const expectedPhoneMatcher = where(
    fn('LOWER', col('User.phone')),
    { [Op.like]: '%agent%' },
  );

  const expectedStoreMatcher = where(
    fn('LOWER', col('store.name')),
    { [Op.like]: '%agent%' },
  );

  assert.equal(filters.role, 'SALES');
  assert.deepEqual(nameMatcher, expectedNameMatcher);
  assert.deepEqual(phoneMatcher, expectedPhoneMatcher);
  assert.deepEqual(storeMatcher, expectedStoreMatcher);
});

test('buildSalesFilters applies mine flag for sales user', () => {
  const filters = buildSalesFilters({ mine: 'true' }, { role: 'SALES', sub: 'user-1' });

  assert.equal(filters.id, 'user-1');
});

test('buildStoreFilters builds search matchers for store name and code', () => {
  const filters = buildStoreFilters({ q: 'Outlet' }, baseUser);

  const [nameMatcher, codeMatcher] = filters[Op.or];

  const expectedNameMatcher = where(
    fn('LOWER', col('Store.name')),
    { [Op.like]: '%outlet%' },
  );

  const expectedCodeMatcher = where(
    fn('LOWER', col('Store.kode_toko')),
    { [Op.like]: '%outlet%' },
  );

  assert.deepEqual(nameMatcher, expectedNameMatcher);
  assert.deepEqual(codeMatcher, expectedCodeMatcher);
});
