const { Product, Store } = require('../models');
const storeService = require('./store.service');

const PRODUCT_LIMIT = 10_000_000;
const PRODUCT_LIMIT_ERROR_CODE = 'PRODUCT_LIMIT_REACHED';

const {
  createStoreNotFoundError,
  STORE_NOT_FOUND_ERROR_CODE,
} = storeService;

const createProductLimitError = () => {
  const error = new Error('Product limit reached');
  error.code = PRODUCT_LIMIT_ERROR_CODE;
  return error;
};

const extractSequenceNumber = (nomorKepesertaan) => {
  if (typeof nomorKepesertaan !== 'string') {
    return 0;
  }

  const match = nomorKepesertaan.match(/-(\d+)$/);
  if (!match) {
    return 0;
  }

  const parsed = Number.parseInt(match[1], 10);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const resolveLockOption = (transaction, shouldLock = false) => {
  if (!shouldLock || !transaction || !transaction.LOCK) {
    return undefined;
  }

  return transaction.LOCK.UPDATE || transaction.LOCK.SHARE || transaction.LOCK.KEY_SHARE;
};

class ProductService {
  constructor() {
    this.limit = PRODUCT_LIMIT;
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

  async generateNomorKepesertaan(storeId, options = {}) {
    const transaction = options.transaction;
    const store = await this.ensureStoreExists(storeId, { transaction, lock: true });

    if (!store.kode_toko) {
      const error = new Error('Store kode_toko is required to generate nomor kepesertaan');
      error.code = STORE_NOT_FOUND_ERROR_CODE;
      throw error;
    }

    const lastProduct = await Product.findOne({
      where: { storeId },
      attributes: ['nomorKepesertaan', 'createdAt'],
      order: [['createdAt', 'DESC']],
      transaction,
      lock: resolveLockOption(transaction, true),
    });

    const nextSequence = extractSequenceNumber(lastProduct?.nomorKepesertaan) + 1;
    const nomorKepesertaan = `${store.kode_toko}-${nextSequence}`;

    return { nomorKepesertaan, store };
  }
}

module.exports = new ProductService();
module.exports.PRODUCT_LIMIT = PRODUCT_LIMIT;
module.exports.PRODUCT_LIMIT_ERROR_CODE = PRODUCT_LIMIT_ERROR_CODE;
module.exports.createProductLimitError = createProductLimitError;
module.exports.extractSequenceNumber = extractSequenceNumber;
module.exports.resolveLockOption = resolveLockOption;
module.exports.STORE_NOT_FOUND_ERROR_CODE = STORE_NOT_FOUND_ERROR_CODE;
