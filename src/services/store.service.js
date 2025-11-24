const { Op } = require('sequelize');
const { Store } = require('../models');
const { buildCaseInsensitiveLike } = require('../utils/filters');

const STORE_LIMIT = 300;
const STORE_LIMIT_ERROR_CODE = 'STORE_LIMIT_REACHED';
const STORE_NOT_FOUND_ERROR_CODE = 'STORE_NOT_FOUND';
const DEFAULT_SCOPE_ATTRIBUTES = ['tenantId', 'companyId', 'ownerId'];

const resolveLimitScope = (data = {}, options = {}) => {
  const explicitScope = options.scope || options.where;
  if (explicitScope && typeof explicitScope === 'object' && explicitScope !== null) {
    return explicitScope;
  }

  const storeAttributes = (Store && Store.rawAttributes) || {};
  const scope = {};

  DEFAULT_SCOPE_ATTRIBUTES.forEach((attribute) => {
    if (
      Object.prototype.hasOwnProperty.call(storeAttributes, attribute)
      && Object.prototype.hasOwnProperty.call(data, attribute)
      && data[attribute] !== undefined
      && data[attribute] !== null
    ) {
      scope[attribute] = data[attribute];
    }
  });

  return scope;
};

const createStoreLimitError = () => {
  const error = new Error('Store limit reached');
  error.code = STORE_LIMIT_ERROR_CODE;
  return error;
};

const createStoreNotFoundError = () => {
  const error = new Error('Store not found');
  error.code = STORE_NOT_FOUND_ERROR_CODE;
  return error;
};

const sanitizeStorePayload = (data = {}, { includeId = false } = {}) => {
  const sanitized = {};

  if (includeId && Object.prototype.hasOwnProperty.call(data, 'id')) {
    sanitized.id = data.id;
  }

  if (Object.prototype.hasOwnProperty.call(data, 'name')) {
    sanitized.name = typeof data.name === 'string' ? data.name.trim() : data.name;
  }

  if (Object.prototype.hasOwnProperty.call(data, 'kode_toko')) {
    const kodeTokoValue = data.kode_toko;
    if (typeof kodeTokoValue === 'string') {
      const trimmed = kodeTokoValue.trim();
      sanitized.kode_toko = trimmed ? trimmed.toUpperCase() : trimmed;
    } else if (kodeTokoValue !== undefined) {
      sanitized.kode_toko = kodeTokoValue;
    }
  }

  if (Object.prototype.hasOwnProperty.call(data, 'address')) {
    sanitized.address = data.address;
  }

  if (Object.prototype.hasOwnProperty.call(data, 'phone')) {
    const phoneValue = data.phone;
    if (typeof phoneValue === 'string') {
      sanitized.phone = phoneValue.trim();
    } else if (phoneValue != null) {
      sanitized.phone = String(phoneValue).trim();
    } else {
      sanitized.phone = phoneValue;
    }
  }

  if (Object.prototype.hasOwnProperty.call(data, 'email')) {
    const emailValue = data.email;
    if (typeof emailValue === 'string') {
      sanitized.email = emailValue.trim();
    } else {
      sanitized.email = emailValue;
    }
  }

  if (Object.prototype.hasOwnProperty.call(data, 'isActive')) {
    sanitized.isActive = data.isActive;
  }

  return sanitized;
};

class StoreService {
  constructor() {
    this.limit = STORE_LIMIT;
  }

  get limitReachedMessage() {
    return 'Pembuatan Toko SUdah Mencapai Limit';
  }

  async checkLimit(options = {}) {
    const scope = options.scope && typeof options.scope === 'object' && options.scope !== null
      ? options.scope
      : {};
    const total = await Store.count({ where: scope, transaction: options.transaction });
    return {
      total,
      limit: this.limit,
      canCreate: total < this.limit,
    };
  }

  async ensureWithinLimit(options = {}) {
    const { total } = await this.checkLimit(options);
    if (total >= this.limit) {
      throw createStoreLimitError();
    }
  }

  async createStore(data, options = {}) {
    const scope = resolveLimitScope(data, options);
    await this.ensureWithinLimit({ ...options, scope });

    const payload = sanitizeStorePayload(data, { includeId: true });
    const store = await Store.create(payload, { transaction: options.transaction });
    return store;
  }

  async updateStore(storeId, changes, options = {}) {
    const store = await Store.findByPk(storeId, { transaction: options.transaction });

    if (!store) {
      throw createStoreNotFoundError();
    }

    const updates = sanitizeStorePayload(changes);
    Object.assign(store, updates);

    await store.save({ transaction: options.transaction });

    return store;
  }

  async getPaginatedStores({ limit, offset, sortBy = 'createdAt', sortOrder = 'DESC', search } = {}) {
    const where = {};

    if (search) {
      const matchers = [
        buildCaseInsensitiveLike('name', search),
        buildCaseInsensitiveLike('kode_toko', search),
      ].filter(Boolean);

      if (matchers.length > 0) {
        where[Op.or] = matchers;
      }
    }

    return Store.findAndCountAll({
      attributes: ['id', 'kode_toko', 'name', 'address', 'phone', 'email', 'isActive'],
      where,
      limit,
      offset,
      order: [[sortBy, sortOrder.toUpperCase()]],
      distinct: true,
    });
  }

  async getAllStores(options = {}) {
    const where = options.where || {};

    return Store.findAll({
      attributes: ['id', 'kode_toko', 'name', 'address', 'phone', 'email', 'isActive'],
      where,
      order: options.order || [['name', 'ASC']],
    });
  }
}

module.exports = new StoreService();
module.exports.STORE_LIMIT = STORE_LIMIT;
module.exports.STORE_LIMIT_ERROR_CODE = STORE_LIMIT_ERROR_CODE;
module.exports.STORE_NOT_FOUND_ERROR_CODE = STORE_NOT_FOUND_ERROR_CODE;
module.exports.createStoreLimitError = createStoreLimitError;
module.exports.createStoreNotFoundError = createStoreNotFoundError;
module.exports.sanitizeStorePayload = sanitizeStorePayload;
