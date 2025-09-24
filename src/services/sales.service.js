const { Product } = require('../models');
const { calculatePriceWarranty } = require('../utils/product-pricing');
const logger = require('../utils/logger');

const ALLOWED_PRODUCT_UPDATES = ['name', 'code', 'price', 'notes', 'persen', 'isActive'];

class SalesService {
  async createProduct(creatorId, storeId, productData) {
    try {
      const sanitizedData = { ...productData };
      delete sanitizedData.priceWarranty;
      sanitizedData.priceWarranty = calculatePriceWarranty(sanitizedData.price, sanitizedData.persen);

      const product = await Product.create({
        ...sanitizedData,
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

  async updateProduct(productId, creatorId, changes) {
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

      const updates = {};
      ALLOWED_PRODUCT_UPDATES.forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(changes, field)) {
          updates[field] = changes[field];
        }
      });

      Object.assign(product, updates);

      if (Object.prototype.hasOwnProperty.call(updates, 'price') || Object.prototype.hasOwnProperty.call(updates, 'persen')) {
        product.priceWarranty = calculatePriceWarranty(product.price, product.persen);
      }
      await product.save();

      logger.info('Product updated by sales user:', {
        productId: product.id,
        creatorId,
        code: product.code,
      });

      return product;
    } catch (error) {
      logger.error('Failed to update product:', error);
      throw error;
    }
  }
}

module.exports = new SalesService();
