const { Store, Product, User } = require('../models');

const STORE_LIMIT = 300;
const STORE_LIMIT_ERROR_CODE = 'STORE_LIMIT_REACHED';
const STORE_NOT_FOUND_ERROR_CODE = 'STORE_NOT_FOUND';
const STORE_HAS_PRODUCTS_ERROR_CODE = 'STORE_HAS_PRODUCTS';
const STORE_HAS_SUPERVISOR_ERROR_CODE = 'STORE_HAS_SUPERVISOR';
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
  const error = new Error('Batas toko telah tercapai');
  error.code = STORE_LIMIT_ERROR_CODE;
  return error;
};

const createStoreNotFoundError = () => {
  const error = new Error('Toko tidak ditemukan');
  error.code = STORE_NOT_FOUND_ERROR_CODE;
  return error;
};

const createStoreHasProductsError = () => {
  const error = new Error('Tidak dapat menghapus toko karena masih ada produk yang terdaftar pada toko ini.');
  error.code = STORE_HAS_PRODUCTS_ERROR_CODE;
  return error;
};

const createStoreHasSupervisorError = () => {
  const error = new Error('Tidak dapat menghapus toko karena masih ada supervisor yang terdaftar pada toko ini.');
  error.code = STORE_HAS_SUPERVISOR_ERROR_CODE;
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
    return 'Pembuatan toko sudah mencapai batas';
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

  async deleteStore(storeId, options = {}) {
    const store = await Store.findByPk(storeId, { transaction: options.transaction });

    if (!store) {
      throw createStoreNotFoundError();
    }

    // Cascade delete: Hapus semua data terkait
    
    // 1. Ambil semua supervisor IDs di toko ini
    const supervisors = await User.findAll({
      where: { storeId, role: 'SUPERVISOR' },
      attributes: ['id'],
      transaction: options.transaction,
    });

    const supervisorIds = supervisors.map(s => s.id);

    // 2. Hapus semua SALES yang terkait dengan SPV di toko ini
    if (supervisorIds.length > 0) {
      await User.destroy({
        where: { 
          supervisorId: supervisorIds,
          role: 'SALES' 
        },
        transaction: options.transaction,
      });
    }

    // 3. Hapus semua SPV/SUPERVISOR di toko ini
    await User.destroy({
      where: { storeId, role: 'SUPERVISOR' },
      transaction: options.transaction,
    });

    // 4. Hapus semua Product di toko ini
    await Product.destroy({
      where: { storeId },
      transaction: options.transaction,
    });

    // 5. Hapus Store
    await store.destroy({ transaction: options.transaction });

    return { message: 'Toko berhasil dihapus' };
  }

  async getPaginatedStores({ limit, offset, sortBy = 'createdAt', sortOrder = 'DESC', where = {} } = {}) {
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
module.exports.STORE_HAS_PRODUCTS_ERROR_CODE = STORE_HAS_PRODUCTS_ERROR_CODE;
module.exports.STORE_HAS_SUPERVISOR_ERROR_CODE = STORE_HAS_SUPERVISOR_ERROR_CODE;
module.exports.createStoreLimitError = createStoreLimitError;
module.exports.createStoreNotFoundError = createStoreNotFoundError;
module.exports.createStoreHasProductsError = createStoreHasProductsError;
module.exports.createStoreHasSupervisorError = createStoreHasSupervisorError;
module.exports.sanitizeStorePayload = sanitizeStorePayload;
