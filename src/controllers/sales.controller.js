const { body, param } = require('express-validator');
const salesService = require('../services/sales.service');
const response = require('../utils/response');
const { handleValidationErrors } = require('../middlewares/validate');
const { parsePaginationQuery, applyPaginationToFindOptions, buildPaginatedResponse } = require('../utils/pagination');
const { buildProductFilters, buildCaseInsensitiveLike } = require('../utils/filters');
const { streamProductsXlsx } = require('../utils/excel');
const { formatProductForOutput } = require('../utils/product-pricing');
const { Product, Store, User } = require('../models');
const productService = require('../services/product.service');
const { STORE_NOT_FOUND_ERROR_CODE } = require('../services/store.service');

const { PRODUCT_LIMIT_ERROR_CODE } = productService;

const createProductValidation = [
  body('name')
    .notEmpty()
    .withMessage('Product name is required')
    .isLength({ min: 2, max: 200 })
    .withMessage('Product name must be between 2 and 200 characters'),
  body('tipe')
    .notEmpty()
    .withMessage('Product type is required')
    .isLength({ max: 100 })
    .withMessage('Product type cannot exceed 100 characters'),
  body('code')
    .notEmpty()
    .withMessage('Product code is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Product code must be between 2 and 50 characters'),
  body('price')
    .notEmpty()
    .withMessage('Price is required')
    .isFloat({ min: 0 })
    .withMessage('Price must be a non-negative number')
    .toFloat(),
  body('persen')
    .notEmpty()
    .withMessage('Persen is required')
    .isFloat({ gt: 0 })
    .withMessage('Persen must be a positive number')
    .toFloat(),
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),
  body('customer_name')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Customer name cannot exceed 200 characters'),
  body('customer_phone')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Customer phone cannot exceed 50 characters'),
  body()
    .custom((value, { req }) => {
      const phone = req.body.customer_phone ?? req.body.customerPhone;

      if (phone === undefined || phone === null || String(phone).trim() === '') {
        throw new Error('Customer phone is required');
      }

      return true;
    }),
  body('customer_email')
    .optional()
    .isEmail()
    .withMessage('Customer email must be a valid email address')
    .isLength({ max: 150 })
    .withMessage('Customer email cannot exceed 150 characters'),
  body('invoice_number')
    .notEmpty()
    .withMessage('Invoice number is required')
    .isString()
    .withMessage('Invoice number must be a string'),
  body('warranty_months')
    .notEmpty()
    .withMessage('Warranty months is required')
    .isInt({ gt: 0 })
    .withMessage('Warranty months must be a positive integer'),
  body('price_warranty')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price warranty must be a non-negative number')
    .toFloat(),
];

const createProduct = async (req, res, next) => {
  try {
    const creatorId = req.user.sub;
    const storeId = req.user.store_id;

    const product = await salesService.createProduct(creatorId, storeId, req.body);
    res.status(201).json(
      response.success('Product created successfully', formatProductForOutput(product)),
    );
  } catch (error) {
    if (error.code === PRODUCT_LIMIT_ERROR_CODE) {
      return res.status(422).json({
        status: false,
        message: productService.limitReachedMessage,
        data: null,
      });
    }

    if (error.code === STORE_NOT_FOUND_ERROR_CODE) {
      return res.status(404).json(response.error('Store not found'));
    }

    next(error);
  }
};

const updateProductValidation = [
  param('id')
    .isUUID()
    .withMessage('Product id must be a valid UUID'),
  body('isActive')
    .exists()
    .withMessage('isActive is required')
    .isBoolean()
    .withMessage('isActive must be a boolean')
    .toBoolean()
    .custom((value) => {
      if (value !== false) {
        throw new Error('Products can only be deactivated (isActive must be false)');
      }
      return true;
    }),
  body()
    .custom((value, { req }) => {
      const allowedFields = ['isActive'];
      const invalidFields = Object.keys(req.body).filter((field) => !allowedFields.includes(field));

      if (invalidFields.length > 0) {
        throw new Error('Only isActive can be updated for a product');
      }

      return true;
    }),
];

const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const creatorId = req.user.sub;

    const result = await salesService.deleteProduct(id, creatorId);
    res.json(response.success('Product deleted successfully', result));
  } catch (error) {
    if (error.message === 'Product not found') {
      return res.status(404).json(response.error('Product not found'));
    }
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const creatorId = req.user.sub;

    const product = await salesService.updateProduct(id, creatorId, req.body);
    res.json(response.success('Product updated successfully', formatProductForOutput(product)));
  } catch (error) {
    if (error.message === 'Product not found') {
      return res.status(404).json(response.error('Product not found'));
    }
    next(error);
  }
};

const getProducts = async (req, res, next) => {
  try {
    const exporting = req.query.export === 'excel';
    const where = buildProductFilters(req.query, req.user);

    const storeInclude = {
      model: Store,
      as: 'store',
      attributes: ['id', 'kode_toko', 'name', 'address', 'phone'],
    };

    if (typeof req.query.store_name === 'string') {
      const trimmedStoreName = req.query.store_name.trim();
      if (trimmedStoreName) {
        const storeNameMatcher = buildCaseInsensitiveLike('store.name', trimmedStoreName);
        if (storeNameMatcher) {
          storeInclude.where = storeNameMatcher;
          storeInclude.required = true;
          where['$store.name$'] = storeNameMatcher;
        }
      }
    }

    const creatorInclude = {
      model: User,
      as: 'creator',
      attributes: ['id', 'name', 'phone', 'supervisorId'],
    };

    if (exporting) {
      creatorInclude.include = [
        {
          model: User,
          as: 'supervisor',
          attributes: ['id', 'name', 'phone'],
          required: false,
        },
      ];
    }

    const baseOptions = {
      where,
      include: [storeInclude, creatorInclude],
      distinct: true,
    };

    if (exporting) {
      const products = await Product.findAll({
        ...baseOptions,
        order: [['createdAt', 'DESC']],
      });
      const formattedProducts = products.map(formatProductForOutput);
      return streamProductsXlsx(res, formattedProducts, `products_sales_${Date.now()}.xlsx`);
    }

    const pageInfo = parsePaginationQuery(req.query);
    const result = await Product.findAndCountAll(
      applyPaginationToFindOptions(baseOptions, pageInfo),
    );

    const formattedResult = {
      count: result.count,
      rows: result.rows.map(formatProductForOutput),
    };

    const paginatedResponse = buildPaginatedResponse(formattedResult, pageInfo);
    res.json(response.paginated('Products retrieved successfully', paginatedResponse));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProductValidation,
  createProduct,
  updateProductValidation,
  updateProduct,
  deleteProduct,
  getProducts,
  handleValidationErrors,
};
