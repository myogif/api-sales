const { Product } = require('../models');
const logger = require('../utils/logger');
const { sanitizeProductPayload, ALLOWED_PRODUCT_UPDATES } = require('./sales.service');

class ServiceCenterService {
  async updateProduct(productId, changes) {
    try {
      // SERVICE_CENTER can update any product, not just their own
      const product = await Product.findOne({
        where: {
          id: productId,
        },
      });

      if (!product) {
        throw new Error('Produk tidak ditemukan');
      }

      const updates = sanitizeProductPayload(changes);

      if (!Object.prototype.hasOwnProperty.call(updates, 'isActive')) {
        throw new Error('Hanya isActive yang dapat diperbarui untuk produk');
      }

      if (updates.isActive !== false) {
        throw new Error('Pembaruan produk hanya mendukung pengaturan isActive menjadi false');
      }

      ALLOWED_PRODUCT_UPDATES.forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(updates, field)) {
          product[field] = updates[field];
        }
      });

      await product.save();

      logger.info('Product updated by SERVICE_CENTER:', {
        productId: product.id,
        code: product.code,
      });

      return product;
    } catch (error) {
      logger.error('Failed to update product (SERVICE_CENTER):', error);
      throw error;
    }
  }
}

module.exports = new ServiceCenterService();
