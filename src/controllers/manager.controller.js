const { body } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const managerService = require('../services/manager.service');
const { STORE_LIMIT_ERROR_CODE } = require('../services/store.service');
const response = require('../utils/response');
const { handleValidationErrors } = require('../middlewares/validate');
const { parsePaginationQuery, applyPaginationToFindOptions, buildPaginatedResponse } = require('../utils/pagination');
const { buildProductFilters, buildCaseInsensitiveLike } = require('../utils/filters');
const { streamProductsXlsx } = require('../utils/excel');
const { formatProductForOutput } = require('../utils/product-pricing');
const { Product, Store, User } = require('../models');

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
    .optional({ checkFalsy: true })
    .isUUID()
    .withMessage('Store ID must be a valid UUID'),
  body().custom((_, { req }) => {
    const originalStoreId = req.body.storeId;
    const { store } = req.body;

    if (!originalStoreId && !store) {
      throw new Error('Either storeId or store details must be provided');
    }

    if (originalStoreId && store) {
      throw new Error('Provide either storeId or store details, not both');
    }

    if (store) {
      if (typeof store !== 'object' || Array.isArray(store)) {
        throw new Error('Store must be an object');
      }

      const name = typeof store.name === 'string' ? store.name.trim() : '';
      if (!name) {
        throw new Error('Store name is required');
      }

      if (name.length < 2 || name.length > 100) {
        throw new Error('Store name must be between 2 and 100 characters');
      }

      const kodeToko = typeof store.kode_toko === 'string' ? store.kode_toko.trim() : '';
      if (!kodeToko) {
        throw new Error('Store code is required');
      }

      if (!/^[A-Z0-9]+$/.test(kodeToko)) {
        throw new Error('Store code must contain only uppercase letters and numbers');
      }

      if (!originalStoreId) {
        req.body.storeId = uuidv4();
      }

      if (store.phone) {
        const phone = String(store.phone);
        if (phone.length < 10 || phone.length > 20) {
          throw new Error('Store phone must be between 10 and 20 characters');
        }
      }

      if (store.email) {
        const email = String(store.email).trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          throw new Error('Store email must be a valid email address');
        }
      }
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
    if (error.code === STORE_LIMIT_ERROR_CODE) {
      return res.status(422).json({
        status: false,
        message: 'Pembuatan Toko SUdah Mencapai Limit',
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