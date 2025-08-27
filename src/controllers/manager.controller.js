const { body } = require('express-validator');
const managerService = require('../services/manager.service');
const response = require('../utils/response');
const { handleValidationErrors } = require('../middlewares/validate');
const { parsePaginationQuery, applyPaginationToFindOptions, buildPaginatedResponse } = require('../utils/pagination');
const { buildProductFilters } = require('../utils/filters');
const { streamProductsXlsx } = require('../utils/excel');
const { Product, Store, User } = require('../models');

const getDashboard = async (req, res, next) => {
  try {
    const dashboard = await managerService.getDashboard();
    res.json(response.success('Dashboard data retrieved successfully', dashboard));
  } catch (error) {
    next(error);
  }
};

const createSupervisorValidation = [
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
  body('storeId')
    .notEmpty()
    .withMessage('Store ID is required')
    .isUUID()
    .withMessage('Store ID must be a valid UUID'),
];

const createSupervisor = async (req, res, next) => {
  try {
    const supervisor = await managerService.createSupervisor(req.body);
    res.status(201).json(response.success('Supervisor created successfully', supervisor));
  } catch (error) {
    next(error);
  }
};

const deleteSupervisor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await managerService.deleteSupervisor(id);
    res.json(response.success('Supervisor deleted successfully', result));
  } catch (error) {
    if (error.message === 'Supervisor not found') {
      return res.status(404).json(response.error('Supervisor not found'));
    }
    next(error);
  }
};

const getSupervisors = async (req, res, next) => {
  try {
    const pageInfo = parsePaginationQuery(req.query);
    const result = await managerService.getSupervisors(
      pageInfo.page,
      pageInfo.limit,
      pageInfo.offset,
      pageInfo.sortBy,
      pageInfo.sortOrder,
    );
    
    const paginatedResponse = buildPaginatedResponse(result, pageInfo);
    res.json(response.paginated('Supervisors retrieved successfully', paginatedResponse));
  } catch (error) {
    next(error);
  }
};

const getSalesUsers = async (req, res, next) => {
  try {
    const pageInfo = parsePaginationQuery(req.query);
    const result = await managerService.getSalesUsers(
      pageInfo.page,
      pageInfo.limit,
      pageInfo.offset,
      pageInfo.sortBy,
      pageInfo.sortOrder,
    );
    
    const paginatedResponse = buildPaginatedResponse(result, pageInfo);
    res.json(response.paginated('Sales users retrieved successfully', paginatedResponse));
  } catch (error) {
    next(error);
  }
};

const getProducts = async (req, res, next) => {
  try {
    const exporting = req.query.export === 'excel';
    const where = buildProductFilters(req.query, req.user);

    const baseOptions = {
      where,
      include: [
        {
          model: Store,
          as: 'store',
          attributes: ['id', 'name', 'address', 'phone'],
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'phone'],
        },
      ],
      distinct: true,
    };

    if (exporting) {
      const products = await Product.findAll({
        ...baseOptions,
        order: [['createdAt', 'DESC']],
      });
      return streamProductsXlsx(res, products, `products_manager_${Date.now()}.xlsx`);
    }

    const pageInfo = parsePaginationQuery(req.query);
    const result = await Product.findAndCountAll(
      applyPaginationToFindOptions(baseOptions, pageInfo),
    );
    
    const paginatedResponse = buildPaginatedResponse(result, pageInfo);
    res.json(response.paginated('Products retrieved successfully', paginatedResponse));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboard,
  createSupervisorValidation,
  createSupervisor,
  deleteSupervisor,
  getSupervisors,
  getSalesUsers,
  getProducts,
  handleValidationErrors,
};