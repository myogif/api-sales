const { body } = require('express-validator');
const managerService = require('../services/manager.service');
const response = require('../utils/response');
const { handleValidationErrors } = require('../middlewares/validate');
const { parsePaginationQuery, applyPaginationToFindOptions, buildPaginatedResponse } = require('../utils/pagination');
const { buildProductFilters, buildCaseInsensitiveLike } = require('../utils/filters');
const { streamProductsXlsx } = require('../utils/excel');
const { formatProductForOutput } = require('../utils/product-pricing');
const { Product, Store, User } = require('../models');
const { Op } = require('sequelize');

const getDashboard = async (req, res, next) => {
  try {
    const dashboard = await managerService.getDashboard();
    res.json(response.success('Dashboard data retrieved successfully', dashboard));
  } catch (error) {
    next(error);
  }
};

const getMonthlyProductSummary = async (req, res, next) => {
  try {
    const { year: yearQuery } = req.query;
    const currentYear = new Date().getUTCFullYear();

    let year = currentYear;

    if (typeof yearQuery !== 'undefined' && yearQuery !== '') {
      const parsedYear = Number(yearQuery);
      if (!Number.isInteger(parsedYear) || parsedYear < 1900 || parsedYear > 9999) {
        return res.status(400).json(response.error('Year must be an integer between 1900 and 9999'));
      }
      year = parsedYear;
    }

    const summary = await managerService.getMonthlyProductSummary(year);
    res.json(response.success('Monthly product summary retrieved successfully', summary));
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
  body().custom((_, { req }) => {
    if (req.body.store) {
      throw new Error('Store creation is no longer supported in this endpoint');
    }

    if (typeof req.body.storeIds !== 'undefined') {
      throw new Error('storeIds is no longer supported; provide a single storeId instead');
    }

    return true;
  }),
];

const createSupervisor = async (req, res, next) => {
  try {
    const supervisor = await managerService.createSupervisor(req.body);
    res.status(201).json(response.success('Supervisor created successfully', supervisor));
  } catch (error) {
    if (error.message === 'Store not found') {
      return res.status(404).json(response.error('Store not found'));
    }
    if (error.message === 'Store information is required') {
      return res.status(400).json(response.error('Store information is required'));
    }
    if (error.code === managerService.SUPERVISOR_LIMIT_ERROR_CODE) {
      return res.status(422).json({
        status: false,
        message: managerService.supervisorLimitMessage,
        data: null,
      });
    }
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

const buildUserFilters = (query, role) => {
  const where = { role };

  const andConditions = [];

  if (typeof query.name === 'string' && query.name.trim()) {
    const matcher = buildCaseInsensitiveLike('User.name', query.name.trim());
    if (matcher) {
      andConditions.push(matcher);
    }
  }

  if (typeof query.phone === 'string' && query.phone.trim()) {
    const matcher = buildCaseInsensitiveLike('User.phone', query.phone.trim());
    if (matcher) {
      andConditions.push(matcher);
    }
  }

  if (andConditions.length > 0) {
    where[Op.and] = andConditions;
  }

  const storeFilters = {};

  if (typeof query.store_name === 'string') {
    const trimmedStoreName = query.store_name.trim();
    if (trimmedStoreName) {
      const storeMatcher = buildCaseInsensitiveLike('store.name', trimmedStoreName);
      if (storeMatcher) {
        storeFilters[Op.and] = [...(storeFilters[Op.and] || []), storeMatcher];
      }
    }
  }

  if (typeof query.store_id === 'string' && query.store_id.trim()) {
    storeFilters.id = query.store_id.trim();
  }

  return { userWhere: where, storeWhere: Object.keys(storeFilters).length ? storeFilters : undefined };
};

const getSupervisors = async (req, res, next) => {
  try {
    const pageInfo = parsePaginationQuery(req.query);
    const filters = buildUserFilters(req.query, 'SUPERVISOR');
    const result = await managerService.getSupervisors(
      pageInfo.page,
      pageInfo.limit,
      pageInfo.offset,
      pageInfo.sortBy,
      pageInfo.sortOrder,
      filters,
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
    const filters = buildUserFilters(req.query, 'SALES');
    const result = await managerService.getSalesUsers(
      pageInfo.page,
      pageInfo.limit,
      pageInfo.offset,
      pageInfo.sortBy,
      pageInfo.sortOrder,
      filters,
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
        }
      }
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
      return streamProductsXlsx(res, formattedProducts, `products_manager_${Date.now()}.xlsx`);
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
  getDashboard,
  createSupervisorValidation,
  createSupervisor,
  deleteSupervisor,
  getSupervisors,
  getSalesUsers,
  getProducts,
  getMonthlyProductSummary,
  handleValidationErrors,
};