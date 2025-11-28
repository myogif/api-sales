const { Op } = require('sequelize');
const { User, Store, Product, sequelize } = require('../models');
const logger = require('../utils/logger');

const SUPERVISOR_LIMIT = 2;
const SUPERVISOR_LIMIT_ERROR_CODE = 'SUPERVISOR_LIMIT_REACHED';
const SUPERVISOR_LIMIT_MESSAGE = 'Jumlah SPV SUdah Mencapai Limit';

const createSupervisorLimitError = () => {
  const error = new Error('Supervisor limit reached');
  error.code = SUPERVISOR_LIMIT_ERROR_CODE;
  return error;
};

class ManagerService {
  constructor() {
    this.supervisorLimit = SUPERVISOR_LIMIT;
  }

  get supervisorLimitMessage() {
    return SUPERVISOR_LIMIT_MESSAGE;
  }

  async getDashboard() {
    try {
      const [totalStores, totalSupervisors, totalSales, totalProducts,topStores ] = await Promise.all([
        Store.count({ where: { isActive: true } }),
        User.count({ where: { role: 'SUPERVISOR', isActive: true } }),
        User.count({ where: { role: 'SALES', isActive: true } }),
        Product.count(),
        Store.findAll({
            attributes: [
              'id',
              'name',
              'address'
            ],
            include: [
              {
                model: Product,
                as: 'products',
                attributes: ['id'], // Only fetch product ID for counting
                required: false,
                paranoid: false,
              }
            ],
            paranoid: false,
            limit: 10,
            subQuery: false // Keep subQuery: false for correct LEFT JOIN behavior
          })
        ]);

      // Manually calculate productCount after fetching
      const topTenStores = topStores.map(s => ({
        storeId: s.id,
        storeName: s.name,
        address: s.address,
        productCount: s.products ? s.products.length : 0, // Count associated products
      }));

      // Sort the stores by productCount in descending order
      topTenStores.sort((a, b) => b.productCount - a.productCount);

      return {
        totalStores,
        totalSupervisors,
        totalSales,
        totalProducts,
        topTenStores: topTenStores.slice(0, 10), // Take top 10 after sorting
      };
    } catch (error) {
      logger.error('Failed to get manager dashboard:', error);
      throw error;
    }
  }

  async countSupervisorsForStore(storeId, options = {}) {
    if (!storeId) {
      return 0;
    }

    return User.count({
      where: { role: 'SUPERVISOR', storeId },
      transaction: options.transaction,
    });
  }

  async ensureSupervisorWithinLimit(storeId, options = {}) {
    const total = await this.countSupervisorsForStore(storeId, options);
    if (total >= this.supervisorLimit) {
      throw createSupervisorLimitError();
    }
    return total;
  }

  async createSupervisor(supervisorData) {
    const transaction = await sequelize.transaction();
    try {
      const { storeIds, storeId, ...userData } = supervisorData;
      const requestedStoreIds = Array.isArray(storeIds) ? storeIds : [];
      if (storeId) {
        requestedStoreIds.push(storeId);
      }

      const uniqueStoreIds = [...new Set(requestedStoreIds.filter(Boolean))];

      if (uniqueStoreIds.length === 0) {
        throw new Error('Store information is required');
      }

      const stores = typeof Store.findAll === 'function'
        ? await Store.findAll({ where: { id: uniqueStoreIds }, transaction })
        : await Promise.all(uniqueStoreIds.map(async (id) => Store.findByPk(id, { transaction })));

      if (!stores.every(Boolean) || stores.length !== uniqueStoreIds.length) {
        throw new Error('Store not found');
      }

      for (const id of uniqueStoreIds) {
        await this.ensureSupervisorWithinLimit(id, { transaction });
      }

      const createdSupervisors = [];

      for (const id of uniqueStoreIds) {
        const supervisor = await User.create({
          ...userData,
          storeId: id,
          role: 'SUPERVISOR',
        }, { transaction });

        await supervisor.reload({
          include: [
            {
              model: Store,
              as: 'store',
              attributes: ['id', 'kode_toko', 'name', 'address', 'phone', 'email'],
            },
          ],
          transaction,
        });

        createdSupervisors.push(supervisor.toSafeJSON());

        logger.info('Supervisor created by manager:', {
          supervisorId: supervisor.id,
          phone: supervisor.phone,
          storeId: supervisor.storeId,
        });
      }

      await transaction.commit();

      return uniqueStoreIds.length === 1 ? createdSupervisors[0] : createdSupervisors;
    } catch (error) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        logger.error('Failed to rollback createSupervisor transaction:', rollbackError);
      }

      logger.error('Failed to create supervisor:', error);
      throw error;
    }
  }

  async deleteSupervisor(supervisorId) {
    const transaction = await sequelize.transaction();
    try {
      const supervisor = await User.findOne({
        where: { id: supervisorId, role: 'SUPERVISOR' },
        transaction,
      });
      const storeId = supervisor ? supervisor.storeId : null;

      if (!supervisor) {
        throw new Error('Supervisor not found');
      }

      const activeSalesCount = await User.count({
        where: { supervisorId, role: 'SALES' },
        transaction,
      });

      if (activeSalesCount > 0) {
        throw new Error('Cannot delete supervisor with active sales');
      }

      const supervisorPhone = supervisor.phone;
      await supervisor.destroy({ force: true, transaction });

      if (storeId) {
        await Store.destroy({ where: { id: storeId }, force: true, transaction });
      }

      await transaction.commit();

      logger.info('Supervisor permanently deleted by manager:', {
        supervisorId,
        phone: supervisorPhone,
        storeId,
      });

      return { message: 'Supervisor permanently deleted successfully' };
    } catch (error) {
      if (!transaction.finished) {
        try {
          await transaction.rollback();
        } catch (rollbackError) {
          logger.error('Failed to rollback deleteSupervisor transaction:', rollbackError);
        }
      }

      logger.error('Failed to delete supervisor:', error);
      throw error;
    }
  }

  async getMonthlyProductSummary(yearInput = new Date().getUTCFullYear()) {
    try {
      const year = typeof yearInput === 'number' && !Number.isNaN(yearInput)
        ? yearInput
        : new Date().getUTCFullYear();

      const startOfYear = new Date(Date.UTC(year, 0, 1));
      const startOfNextYear = new Date(Date.UTC(year + 1, 0, 1));

      const createdAt = Product.rawAttributes.createdAt.field || 'createdAt';
      const createdAtColumn = sequelize.col(`${Product.name}.${createdAt}`);
      const monthExpression = sequelize.fn(
        'DATE_FORMAT',
        createdAtColumn,
        '%Y-%m-01T00:00:00.000Z',
      );

      const results = await Product.findAll({
        attributes: [
          [monthExpression, 'month'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'productCount'],
        ],
        where: {
          createdAt: {
            [Op.gte]: startOfYear,
            [Op.lt]: startOfNextYear,
          },
        },
        group: [monthExpression],
        order: [[monthExpression, 'ASC']],
        raw: true,
      });

      const monthCountMap = results.reduce((acc, { month, productCount }) => {
        if (month) {
          const parsedMonth = new Date(month);
          const monthIndex = parsedMonth.getUTCMonth();
          if (!Number.isNaN(monthIndex)) {
            acc[monthIndex] = Number(productCount);
          }
        }
        return acc;
      }, {});

      const monthNames = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];

      const monthlyProducts = monthNames.map((name, index) => ({
        month: name,
        total: monthCountMap[index] ?? 0,
      }));

      return { year, monthlyProducts };
    } catch (error) {
      logger.error('Failed to get monthly product summary:', error);
      throw error;
    }
  }

  async getSupervisors(page, limit, offset, sortBy, sortOrder) {
    try {
      const result = await User.findAndCountAll({
        where: { role: 'SUPERVISOR' },
        include: [
          {
            model: Store,
            as: 'store',
            attributes: ['id', 'kode_toko', 'name', 'address', 'phone'],
          },
        ],
        limit,
        offset,
        order: [[sortBy, sortOrder.toUpperCase()]],
        distinct: true,
      });

      return result;
    } catch (error) {
      logger.error('Failed to get supervisors:', error);
      throw error;
    }
  }

  async getSalesUsers(page, limit, offset, sortBy, sortOrder) {
    try {
      const result = await User.findAndCountAll({
        where: { role: 'SALES' },
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
        limit,
        offset,
        order: [[sortBy, sortOrder.toUpperCase()]],
        distinct: true,
      });

      return result;
    } catch (error) {
      logger.error('Failed to get sales users:', error);
      throw error;
    }
  }
}

module.exports = new ManagerService();
module.exports.SUPERVISOR_LIMIT = SUPERVISOR_LIMIT;
module.exports.SUPERVISOR_LIMIT_ERROR_CODE = SUPERVISOR_LIMIT_ERROR_CODE;
module.exports.SUPERVISOR_LIMIT_MESSAGE = SUPERVISOR_LIMIT_MESSAGE;
module.exports.createSupervisorLimitError = createSupervisorLimitError;
