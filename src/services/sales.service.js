const { Product, Store, User } = require('../models');
const logger = require('../utils/logger');

class SalesService {
  async createProduct(creatorId, storeId, productData) {
    try {
      const product = await Product.create({
        ...productData,
        creatorId,
        storeId,
      });

      logger.info('Product created by sales user:', {
        productId: product.id,
        creatorId,
        code: product.code,
      });

      return product;
    } catch (error) {
      logger.error('Failed to create product:', error);
      throw error;
    }
  }

  async deleteProduct(productId, creatorId) {
    try {
      const product = await Product.findOne({
        where: { 
          id: productId,
          creatorId,
        },
      });

      if (!product) {
        throw new Error('Product not found');
      }

      await product.destroy();

      logger.info('Product deleted by sales user:', {
        productId,
        creatorId,
        code: product.code,
      });

      return { message: 'Product deleted successfully' };
    } catch (error) {
      logger.error('Failed to delete product:', error);
      throw error;
    }
  }
}

module.exports = new SalesService();
