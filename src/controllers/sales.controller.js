const { body, param } = require('express-validator');
const salesService = require('../services/sales.service');
const response = require('../utils/response');
const { handleValidationErrors } = require('../middlewares/validate');
const { parsePaginationQuery, applyPaginationToFindOptions, buildPaginatedResponse } = require('../utils/pagination');
const { buildProductFilters } = require('../utils/filters');
const { streamProductsXlsx } = require('../utils/excel');
const { formatProductForOutput } = require('../utils/product-pricing');
const { Product, Store, User } = require('../models');

const createProductValidation = [
  body('name')
    .notEmpty()
    .withMessage('Product name is required')
    .isLength({ min: 2, max: 200 })
    .withMessage('Product name must be between 2 and 200 characters'),
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
    .withMessage('Persen is required'),
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),
];

const createProduct = async (req, res, next) => {
  try {
    const creatorId = req.user.sub;
    const storeId = req.user.store_id;

    const product = await salesService.createProduct(creatorId, storeId, req.body);
    res.status(201).json(response.success('Product created successfully', product));
  } catch (error) {
    next(error);
  }
};

const updateProductValidation = [
  param('id')
    .isUUID()
    .withMessage('Product id must be a valid UUID'),
  body('name')
    .optional()
    .isLength({ min: 2, max: 200 })
    .withMessage('Product name must be between 2 and 200 characters'),
  body('code')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('Product code must be between 2 and 50 characters'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a non-negative number')
    .toFloat(),
  body('persen')
    .optional()
    .isInt()
    .withMessage('Persen must be an integer'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
    .toBoolean(),
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),
  body()
    .custom((value, { req }) => {
      const allowedFields = ['name', 'code', 'price', 'notes', 'persen', 'isActive'];
      const hasAllowedField = allowedFields.some((field) => Object.prototype.hasOwnProperty.call(req.body, field));

      if (!hasAllowedField) {
        throw new Error('At least one field must be provided for update');
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
    res.json(response.success('Product updated successfully', product));
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
      attributes: ['id', 'name', 'address', 'phone'],
    };

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
