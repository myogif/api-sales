const { Op } = require('sequelize');
const { User, Store, Product, sequelize } = require('../models');
const logger = require('../utils/logger');

class ManagerService {
  async getDashboard() {
    try {
      const [totalStores, totalSupervisors, totalSales, totalProducts,topStores ] = await Promise.all([
        Store.count({ where: { isActive: true } }),
        User.count({ where: { role: 'SUPERVISOR', isActive: true } }),
        User.count({ where: { role: 'SALES', isActive: true } }),
        Product.count({ where: { isActive: true } }),
        Store.findAll({
            attributes: [
              'id',
              'name',
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

  async createSupervisor(supervisorData) {
    const transaction = await sequelize.transaction();
    try {
      const { store: storePayload, storeId, ...userData } = supervisorData;
      let resolvedStoreId = storeId;

      if (storePayload) {
        if (!resolvedStoreId) {
          throw new Error('Store information is required');
        }

        const newStore = await Store.create({
          id: resolvedStoreId,
          name: storePayload.name.trim(),
          address: storePayload.address,
          phone: storePayload.phone ? String(storePayload.phone).trim() : undefined,
          email: storePayload.email ? String(storePayload.email).trim() : undefined,
          isActive: typeof storePayload.isActive === 'boolean' ? storePayload.isActive : undefined,
        }, { transaction });

        resolvedStoreId = newStore.id;

        logger.info('Store created for supervisor:', {
          storeId: newStore.id,
          storeName: newStore.name,
        });
      } else if (resolvedStoreId) {
        const existingStore = await Store.findByPk(resolvedStoreId, { transaction });
        if (!existingStore) {
          throw new Error('Store not found');
        }
      }

      if (!resolvedStoreId) {
        throw new Error('Store information is required');
      }

      const supervisor = await User.create({
        ...userData,
        storeId: resolvedStoreId,
        role: 'SUPERVISOR',
      }, { transaction });

      await supervisor.reload({
        include: [
          {
            model: Store,
            as: 'store',
            attributes: ['id', 'name', 'address', 'phone', 'email'],
          },
        ],
        transaction,
      });

      await transaction.commit();

      logger.info('Supervisor created by manager:', {
        supervisorId: supervisor.id,
        phone: supervisor.phone,
        storeId: supervisor.storeId,
      });

      return supervisor.toSafeJSON();
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
    try {
      const supervisor = await User.findOne({
        where: { id: supervisorId, role: 'SUPERVISOR' },
      });

      if (!supervisor) {
        throw new Error('Supervisor not found');
      }

      // Soft delete supervisor
      await supervisor.destroy();

      // Also soft delete all sales users under this supervisor
      await User.destroy({
        where: { supervisorId, role: 'SALES' },
      });

      logger.info('Supervisor deleted by manager:', {
        supervisorId,
        phone: supervisor.phone,
      });

      return { message: 'Supervisor deleted successfully' };
    } catch (error) {
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
          isActive: true,
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
            attributes: ['id', 'name', 'address', 'phone'],
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
            attributes: ['id', 'name', 'address', 'phone'],
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
