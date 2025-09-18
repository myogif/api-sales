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
      const { store: storePayload, storeId: existingStoreId, ...userData } = supervisorData;
      let storeId = existingStoreId;

      if (storePayload) {
        const newStore = await Store.create({
          name: storePayload.name.trim(),
          address: storePayload.address,
          phone: storePayload.phone ? String(storePayload.phone).trim() : undefined,
          email: storePayload.email ? String(storePayload.email).trim() : undefined,
          isActive: typeof storePayload.isActive === 'boolean' ? storePayload.isActive : undefined,
        }, { transaction });

        storeId = newStore.id;

        logger.info('Store created for supervisor:', {
          storeId: newStore.id,
          storeName: newStore.name,
        });
      } else if (storeId) {
        const existingStore = await Store.findByPk(storeId, { transaction });
        if (!existingStore) {
          throw new Error('Store not found');
        }
      }

      if (!storeId) {
        throw new Error('Store information is required');
      }

      const supervisor = await User.create({
        ...userData,
        storeId,
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
