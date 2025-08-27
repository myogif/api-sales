const { User, Store, Product } = require('../models');
const logger = require('../utils/logger');

class SupervisorService {
  async createSalesUser(supervisorId, storeId, salesData) {
    try {
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
          supervisorId,
        },
      });

      if (!salesUser) {
        throw new Error('Sales user not found');
      }

      await salesUser.destroy();

      logger.info('Sales user deleted by supervisor:', {
        salesUserId,
        supervisorId,
        phone: salesUser.phone,
      });

      return { message: 'Sales user deleted successfully' };
    } catch (error) {
      logger.error('Failed to delete sales user:', error);
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
            attributes: ['id', 'name', 'address', 'phone'],
          },
        ],
      });

      return salesUsers;
    } catch (error) {
      logger.error('Failed to get sales users:', error);
      throw error;
    }
  }
}

module.exports = new SupervisorService();