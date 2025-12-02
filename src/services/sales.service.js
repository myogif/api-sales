const { Product, sequelize } = require('../models');
const { calculatePriceWarranty } = require('../utils/product-pricing');
const logger = require('../utils/logger');
const productService = require('./product.service');
const { STORE_NOT_FOUND_ERROR_CODE } = require('./store.service');

const { PRODUCT_LIMIT_ERROR_CODE, MAX_SEQUENCE_ATTEMPTS } = productService;

const ALLOWED_PRODUCT_UPDATES = ['isActive'];

const mapNullableString = (value) => {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  return value;
};

const sanitizeProductPayload = (data = {}) => {
  const sanitized = {};

  if (Object.prototype.hasOwnProperty.call(data, 'name')) {
    sanitized.name = mapNullableString(data.name);
  }

  if (Object.prototype.hasOwnProperty.call(data, 'code')) {
    sanitized.code = mapNullableString(data.code);
  }

  if (Object.prototype.hasOwnProperty.call(data, 'price')) {
    sanitized.price = data.price;
  }

  if (Object.prototype.hasOwnProperty.call(data, 'notes')) {
    sanitized.notes = data.notes;
  }

  if (Object.prototype.hasOwnProperty.call(data, 'persen')) {
    sanitized.persen = data.persen;
  }

  const invoiceNumberValue = Object.prototype.hasOwnProperty.call(data, 'invoiceNumber')
    ? data.invoiceNumber
    : data.invoice_number;
  if (invoiceNumberValue !== undefined) {
    sanitized.invoiceNumber = mapNullableString(invoiceNumberValue);
  }

  const warrantyMonthsValue = Object.prototype.hasOwnProperty.call(data, 'warrantyMonths')
    ? data.warrantyMonths
    : data.warranty_months;
  if (warrantyMonthsValue !== undefined) {
    const numericWarrantyMonths = Number(warrantyMonthsValue);
    sanitized.warrantyMonths = Number.isNaN(numericWarrantyMonths)
      ? warrantyMonthsValue
      : numericWarrantyMonths;
  }

  if (Object.prototype.hasOwnProperty.call(data, 'isActive')) {
    sanitized.isActive = data.isActive;
  }

  if (Object.prototype.hasOwnProperty.call(data, 'tipe')) {
    sanitized.tipe = mapNullableString(data.tipe);
  }

  const customerNameValue = Object.prototype.hasOwnProperty.call(data, 'customerName')
    ? data.customerName
    : data.customer_name;
  if (customerNameValue !== undefined) {
    sanitized.customerName = mapNullableString(customerNameValue);
  }

  const customerPhoneValue = Object.prototype.hasOwnProperty.call(data, 'customerPhone')
    ? data.customerPhone
    : data.customer_phone;
  if (customerPhoneValue !== undefined) {
    if (typeof customerPhoneValue === 'string') {
      sanitized.customerPhone = customerPhoneValue.trim();
    } else if (customerPhoneValue != null) {
      sanitized.customerPhone = String(customerPhoneValue).trim();
    } else {
      sanitized.customerPhone = customerPhoneValue;
    }
  }

  const customerEmailValue = Object.prototype.hasOwnProperty.call(data, 'customerEmail')
    ? data.customerEmail
    : data.customer_email;
  if (customerEmailValue !== undefined) {
    if (typeof customerEmailValue === 'string') {
      const trimmed = customerEmailValue.trim();
      sanitized.customerEmail = trimmed ? trimmed.toLowerCase() : trimmed;
    } else {
      sanitized.customerEmail = customerEmailValue;
    }
  }

  return sanitized;
};

class SalesService {
  async createProduct(creatorId, storeId, productData) {
    const sanitizedData = sanitizeProductPayload(productData);
    delete sanitizedData.priceWarranty;
    delete sanitizedData.nomorKepesertaan;

    const maxAttempts = typeof productService.maxSequenceAttempts === 'number'
      ? productService.maxSequenceAttempts
      : MAX_SEQUENCE_ATTEMPTS;

    let attempt = 0;
    let lastError;

    while (attempt < maxAttempts) {
      attempt += 1;
      try {
        const product = await sequelize.transaction(async (transaction) => {
          await productService.ensureWithinLimit({ transaction });

          const { nomorKepesertaan } = await productService.generateNomorKepesertaan(
            storeId,
            sanitizedData.customerPhone,
            { transaction },
          );

          const payload = {
            ...sanitizedData,
            priceWarranty: calculatePriceWarranty(sanitizedData.price, sanitizedData.persen),
            nomorKepesertaan,
            creatorId,
            storeId,
          };

          const createdProduct = await Product.create(payload, { transaction });

          return createdProduct;
        });

        logger.info('Product created by sales user:', {
          productId: product.id,
          creatorId,
          code: product.code,
        });

        return product;
      } catch (error) {
        lastError = error;
        const isUniqueViolation = error && error.name === 'SequelizeUniqueConstraintError';

        if (isUniqueViolation && attempt < maxAttempts) {
          if (typeof logger.warn === 'function') {
            logger.warn('Retrying product creation due to nomor_kepesertaan conflict', {
              attempt,
              maxAttempts,
              storeId,
            });
          }
          continue;
        }

        if (error.code === PRODUCT_LIMIT_ERROR_CODE || error.code === STORE_NOT_FOUND_ERROR_CODE) {
          if (typeof logger.warn === 'function') {
            logger.warn('Product creation warning:', error);
          } else {
            logger.info('Product creation warning:', { message: error.message, code: error.code });
          }
        } else {
          logger.error('Failed to create product:', error);
        }

        throw error;
      }
    }

    throw lastError || new Error('Failed to create product after exhausting retries');
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

      const updates = sanitizeProductPayload(changes);

      if (!Object.prototype.hasOwnProperty.call(updates, 'isActive')) {
        throw new Error('Only isActive can be updated for a product');
      }

      if (updates.isActive !== false) {
        throw new Error('Product updates only support setting isActive to false');
      }

      ALLOWED_PRODUCT_UPDATES.forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(updates, field)) {
          product[field] = updates[field];
        }
      });

      await product.save();

      logger.info('Product updated by sales user:', {
        productId: product.id,
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
module.exports.sanitizeProductPayload = sanitizeProductPayload;
module.exports.ALLOWED_PRODUCT_UPDATES = ALLOWED_PRODUCT_UPDATES;
module.exports.mapNullableString = mapNullableString;
