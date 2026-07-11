const { Product, Store } = require('../models');
const storeService = require('./store.service');

const PRODUCT_LIMIT = 10_000_000;
const PRODUCT_LIMIT_ERROR_CODE = 'PRODUCT_LIMIT_REACHED';
const MAX_SEQUENCE_ATTEMPTS = 3;
const CUSTOMER_PHONE_REQUIRED_ERROR_CODE = 'CUSTOMER_PHONE_REQUIRED';
const NOMOR_KEPESERTAAN_CONFLICT_ERROR_CODE = 'NOMOR_KEPESERTAAN_CONFLICT';

const {
  createStoreNotFoundError,
  STORE_NOT_FOUND_ERROR_CODE,
} = storeService;

const createProductLimitError = () => {
  const error = new Error('Product limit reached');
  error.code = PRODUCT_LIMIT_ERROR_CODE;
  return error;
};

const resolveLockOption = (transaction, shouldLock = false) => {
  if (!shouldLock || !transaction || !transaction.LOCK) {
    return undefined;
  }

  return transaction.LOCK.UPDATE || transaction.LOCK.SHARE || transaction.LOCK.KEY_SHARE;
};

const extractLastThreeDigits = (phone) => {
  if (phone === null || phone === undefined) {
    return null;
  }

  const digits = String(phone).replace(/\D/g, '');
  if (!digits) {
    return null;
  }

  const suffix = digits.slice(-3);
  return suffix.padStart(3, '0');
};

const buildNomorKepesertaan = (kodeToko, customerPhone, sequence = 0) => {
  const lastDigits = extractLastThreeDigits(customerPhone);

  if (!lastDigits) {
    const error = new Error('Customer phone is required to generate nomor kepesertaan');
    error.code = CUSTOMER_PHONE_REQUIRED_ERROR_CODE;
    throw error;
  }

  if (sequence > 0) {
    return `${kodeToko}-${lastDigits}-${sequence}`;
  }

  return `${kodeToko}-${lastDigits}`;
};

class ProductService {
  constructor() {
    this.limit = PRODUCT_LIMIT;
    this.maxSequenceAttempts = MAX_SEQUENCE_ATTEMPTS;
  }

  get limitReachedMessage() {
    return 'Jumlah produk SUdah Mencapai Limit';
  }

  async checkLimit(options = {}) {
    const total = await Product.count({ transaction: options.transaction });
    return {
      total,
      limit: PRODUCT_LIMIT,
      canCreate: total < PRODUCT_LIMIT,
    };
  }

  async ensureWithinLimit(options = {}) {
    const { total } = await this.checkLimit(options);
    if (total >= PRODUCT_LIMIT) {
      throw createProductLimitError();
    }
  }

  async ensureStoreExists(storeId, options = {}) {
    const transaction = options.transaction;
    const store = await Store.findByPk(storeId, {
      transaction,
      lock: resolveLockOption(transaction, options.lock === true),
    });

    if (!store) {
      throw createStoreNotFoundError();
    }

    return store;
  }

  async generateNomorKepesertaan(storeId, customerPhone, options = {}) {
    const transaction = options.transaction;
    const store = await this.ensureStoreExists(storeId, { transaction, lock: true });

    if (!store.kode_toko) {
      const error = new Error('Store kode_toko is required to generate nomor kepesertaan');
      error.code = STORE_NOT_FOUND_ERROR_CODE;
      throw error;
    }

    for (let sequence = 0; sequence < this.maxSequenceAttempts; sequence += 1) {
      const nomorKepesertaan = buildNomorKepesertaan(store.kode_toko, customerPhone, sequence);

      const existingProduct = await Product.findOne({
        where: { nomorKepesertaan },
        transaction,
        lock: resolveLockOption(transaction, options.lock === true),
      });

      if (!existingProduct) {
        return { nomorKepesertaan, store };
      }
    }

    const error = new Error('Failed to generate unique nomor kepesertaan');
    error.code = NOMOR_KEPESERTAAN_CONFLICT_ERROR_CODE;
    throw error;
  }
}

module.exports = new ProductService();
module.exports.PRODUCT_LIMIT = PRODUCT_LIMIT;
module.exports.PRODUCT_LIMIT_ERROR_CODE = PRODUCT_LIMIT_ERROR_CODE;
module.exports.createProductLimitError = createProductLimitError;
module.exports.resolveLockOption = resolveLockOption;
module.exports.STORE_NOT_FOUND_ERROR_CODE = STORE_NOT_FOUND_ERROR_CODE;
module.exports.MAX_SEQUENCE_ATTEMPTS = MAX_SEQUENCE_ATTEMPTS;
module.exports.buildNomorKepesertaan = buildNomorKepesertaan;
module.exports.CUSTOMER_PHONE_REQUIRED_ERROR_CODE = CUSTOMER_PHONE_REQUIRED_ERROR_CODE;
module.exports.NOMOR_KEPESERTAAN_CONFLICT_ERROR_CODE = NOMOR_KEPESERTAAN_CONFLICT_ERROR_CODE;
module.exports.extractLastThreeDigits = extractLastThreeDigits;
