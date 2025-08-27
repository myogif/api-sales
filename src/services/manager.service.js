const { User, Store, Product } = require('../models');
const { Op } = require('sequelize');
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
              [fn('COUNT', col('products.id')), 'productCount']
            ],
            include: [
              {
                model: Product,
                as: 'products',
                attributes: [],
                required: false,
                paranoid: false,         // penting untuk lifetime
              }
            ],
            // Jika Store juga pakai paranoid dan kamu ingin benar2 lifetime, aktifkan ini:
            paranoid: false,
            group: ['Store.id'],
            order: [[fn('COUNT', col('products.id')), 'DESC']],
            limit: 10,
          })
        ]);

      const topTenStores = topStores.map(s => ({
        storeId: s.id,
        storeName: s.name,
        productCount: Number(s.get('productCount')) || 0,
      }));

      return {
        totalStores,
        totalSupervisors,
        totalSales,
        totalProducts,
        topTenStores, 
      };
    } catch (error) {
      logger.error('Failed to get manager dashboard:', error);
      throw error;
    }
  }

  async createSupervisor(supervisorData) {
    try {
      const supervisor = await User.create({
        ...supervisorData,
        role: 'SUPERVISOR',
      });

      logger.info('Supervisor created by manager:', {
        supervisorId: supervisor.id,
        phone: supervisor.phone,
      });

      return supervisor.toSafeJSON();
    } catch (error) {
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