const { User, Store, Product } = require('../models');
const logger = require('../utils/logger');

const SALES_LIMIT = 20;
const SALES_LIMIT_ERROR_CODE = 'SALES_LIMIT_REACHED';
const SALES_LIMIT_MESSAGE = 'Jumlah sales sudah mencapai batas';

const createSalesLimitError = () => {
  const error = new Error('Batas sales telah tercapai');
  error.code = SALES_LIMIT_ERROR_CODE;
  return error;
};

class SupervisorService {
  constructor() {
    this.salesLimit = SALES_LIMIT;
  }

  get salesLimitMessage() {
    return SALES_LIMIT_MESSAGE;
  }

  async countSalesForStore(storeId, options = {}) {
    if (!storeId) {
      return 0;
    }

    return User.count({
      where: {
        role: 'SALES',
        storeId,
      },
      transaction: options.transaction,
    });
  }

  async ensureSalesWithinLimit(storeId, options = {}) {
    const total = await this.countSalesForStore(storeId, options);
    if (total >= this.salesLimit) {
      throw createSalesLimitError();
    }
    return total;
  }

  async createSalesUser(supervisorId, storeId, salesData) {
    try {
      await this.ensureSalesWithinLimit(storeId);

      const salesUser = await User.create({
        ...salesData,
        role: 'SALES',
        supervisorId,
        storeId,
      });

      logger.info('Sales user created by supervisor:', {
        salesUserId: salesUser.id,
        supervisorId,
        phone: salesUser.phone,
      });

      return salesUser.toSafeJSON();
    } catch (error) {
      logger.error('Failed to create sales user:', error);
      throw error;
    }
  }

  async deleteSalesUser(salesUserId, supervisorId) {
    try {
      const salesUser = await User.findOne({
        where: {
          id: salesUserId,
          role: 'SALES',
        },
      });

      if (!salesUser) {
        throw new Error('Sales tidak ditemukan');
      }

      // Deactivate instead of delete
      await salesUser.update({ isActive: false });

      logger.info('Sales user deactivated by supervisor:', {
        salesUserId,
        supervisorId,
        phone: salesUser.phone,
      });

      return { message: 'Sales berhasil dinonaktifkan' };
    } catch (error) {
      logger.error('Failed to deactivate sales user:', error);
      throw error;
    }
  }

  async getSalesUsers(supervisorId, storeId) {
    try {
      const salesUsers = await User.findAll({
        where: {
          role: 'SALES',
          supervisorId,
          storeId,
        },
        include: [
          {
            model: Store,
            as: 'store',
            attributes: ['id', 'kode_toko', 'name', 'address', 'phone'],
          },
          {
            model: User,
            as: 'supervisor',
            attributes: ['id', 'name', 'phone'],
          },
        ],
      });

      return salesUsers;
    } catch (error) {
      logger.error('Failed to get sales users:', error);
      throw error;
    }
  }

  async deleteProduct(productId, supervisorId, storeId) {
    try {
      const product = await Product.findOne({
        where: {
          id: productId,
          storeId,
        },
      });

      if (!product) {
        throw new Error('Produk tidak ditemukan');
      }

      await product.destroy();

      logger.info('Product deleted by supervisor:', {
        productId,
        supervisorId,
        storeId,
        code: product.code,
      });

      return { message: 'Produk berhasil dihapus' };
    } catch (error) {
      logger.error('Failed to delete product:', error);
      throw error;
    }
  }
}

module.exports = new SupervisorService();
module.exports.SALES_LIMIT = SALES_LIMIT;
module.exports.SALES_LIMIT_ERROR_CODE = SALES_LIMIT_ERROR_CODE;
module.exports.SALES_LIMIT_MESSAGE = SALES_LIMIT_MESSAGE;
module.exports.createSalesLimitError = createSalesLimitError;
