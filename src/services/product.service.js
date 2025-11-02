const { Product, Store, StoreProductSequence } = require('../models');
const storeService = require('./store.service');

const PRODUCT_LIMIT = 10_000_000;
const PRODUCT_LIMIT_ERROR_CODE = 'PRODUCT_LIMIT_REACHED';
const MAX_SEQUENCE_ATTEMPTS = 3;

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

const buildNomorKepesertaan = (kodeToko, sequenceNumber) => {
  return `${kodeToko}-${sequenceNumber}`;
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

  async getOrCreateSequence(storeId, transaction) {
    const lock = resolveLockOption(transaction, true);
    let sequence = await StoreProductSequence.findOne({
      where: { storeId },
      transaction,
      lock,
    });

    if (!sequence) {
      sequence = await StoreProductSequence.create({
        storeId,
        nextNumber: 1,
      }, { transaction });
    }

    return sequence;
  }

  async reserveNextSequence(store, options = {}) {
    const { transaction } = options;
    const sequence = await this.getOrCreateSequence(store.id, transaction);

    const reservedNumber = sequence.nextNumber;
    await sequence.increment('nextNumber', { by: 1, transaction });

    return buildNomorKepesertaan(store.kode_toko, reservedNumber);
  }

  async generateNomorKepesertaan(storeId, options = {}) {
    const transaction = options.transaction;
    const store = await this.ensureStoreExists(storeId, { transaction, lock: true });

    if (!store.kode_toko) {
      const error = new Error('Store kode_toko is required to generate nomor kepesertaan');
      error.code = STORE_NOT_FOUND_ERROR_CODE;
      throw error;
    }

    const nomorKepesertaan = await this.reserveNextSequence(store, { transaction });

    return { nomorKepesertaan, store };
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
