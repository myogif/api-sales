const { body } = require('express-validator');
const supervisorService = require('../services/supervisor.service');
const response = require('../utils/response');
const { handleValidationErrors } = require('../middlewares/validate');
const { parsePaginationQuery, applyPaginationToFindOptions, buildPaginatedResponse } = require('../utils/pagination');
const { buildProductFilters } = require('../utils/filters');
const { streamProductsXlsx } = require('../utils/excel');
const { formatProductForOutput } = require('../utils/product-pricing');
const { Product, Store, User } = require('../models');

const createSalesValidation = [
  body('phone')
    .notEmpty()
    .withMessage('Phone number is required')
    .isLength({ min: 10, max: 20 })
    .withMessage('Phone number must be between 10 and 20 characters'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
];

const createSalesUser = async (req, res, next) => {
  try {
    const supervisorId = req.user.sub;
    const storeId = req.user.store_id;
    
    const salesUser = await supervisorService.createSalesUser(supervisorId, storeId, req.body);
    res.status(201).json(response.success('Sales user created successfully', salesUser));
  } catch (error) {
    next(error);
  }
};

const deleteSalesUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const supervisorId = req.user.sub;
    
    const result = await supervisorService.deleteSalesUser(id, supervisorId);
    res.json(response.success('Sales user deleted successfully', result));
  } catch (error) {
    if (error.message === 'Sales user not found') {
      return res.status(404).json(response.error('Sales user not found'));
    }
    next(error);
  }
};

const getSalesUsers = async (req, res, next) => {
  try {
    const supervisorId = req.user.sub;
    const storeId = req.user.store_id;
    
    const salesUsers = await supervisorService.getSalesUsers(supervisorId, storeId);
    res.json(response.success('Sales users retrieved successfully', salesUsers));
  } catch (error) {
    next(error);
  }
};

const getProducts = async (req, res, next) => {
  try {
    const exporting = req.query.export === 'excel';
    const where = buildProductFilters(req.query, req.user);

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

    if (req.query.supervisor_id) {
      creatorInclude.where = { supervisorId: req.query.supervisor_id };
    }

    const baseOptions = {
      where,
      include: [
        {
          model: Store,
          as: 'store',
          attributes: ['id', 'name', 'address', 'phone'],
        },
        creatorInclude,
      ],
      distinct: true,
    };

    if (exporting) {
      const products = await Product.findAll({
        ...baseOptions,
        order: [['createdAt', 'DESC']],
      });
      const formattedProducts = products.map(formatProductForOutput);
      return streamProductsXlsx(res, formattedProducts, `products_supervisor_${Date.now()}.xlsx`);
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
  createSalesValidation,
  createSalesUser,
  deleteSalesUser,
  getSalesUsers,
  getProducts,
  handleValidationErrors,
};