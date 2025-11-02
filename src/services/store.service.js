const { Store } = require('../models');

const STORE_LIMIT = 300;
const STORE_LIMIT_ERROR_CODE = 'STORE_LIMIT_REACHED';
const STORE_NOT_FOUND_ERROR_CODE = 'STORE_NOT_FOUND';

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
    const total = await Store.count({ transaction: options.transaction });
    return {
      total,
      limit: STORE_LIMIT,
      canCreate: total < STORE_LIMIT,
    };
  }

  async ensureWithinLimit(options = {}) {
    const { total } = await this.checkLimit(options);
    if (total >= STORE_LIMIT) {
      throw createStoreLimitError();
    }
  }

  async createStore(data, options = {}) {
    await this.ensureWithinLimit(options);

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
}

module.exports = new StoreService();
module.exports.STORE_LIMIT = STORE_LIMIT;
module.exports.STORE_LIMIT_ERROR_CODE = STORE_LIMIT_ERROR_CODE;
module.exports.STORE_NOT_FOUND_ERROR_CODE = STORE_NOT_FOUND_ERROR_CODE;
module.exports.createStoreLimitError = createStoreLimitError;
module.exports.createStoreNotFoundError = createStoreNotFoundError;
module.exports.sanitizeStorePayload = sanitizeStorePayload;
