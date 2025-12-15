const { body } = require('express-validator');
const managerService = require('../services/manager.service');
const response = require('../utils/response');
const { handleValidationErrors } = require('../middlewares/validate');
const { parsePaginationQuery, applyPaginationToFindOptions, buildPaginatedResponse } = require('../utils/pagination');
const {
  buildProductFilters,
  buildCaseInsensitiveLike,
  buildSupervisorFilters,
  buildSalesFilters,
} = require('../utils/filters');
const { streamProductsXlsx } = require('../utils/excel');
const { formatProductForOutput } = require('../utils/product-pricing');
const { Product, Store, User } = require('../models');

const getDashboard = async (req, res, next) => {
  try {
    const dashboard = await managerService.getDashboard();
    res.json(response.success('Data dashboard berhasil diambil', dashboard));
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
        return res.status(400).json(response.error('Tahun harus berupa bilangan bulat antara 1900 dan 9999'));
      }
      year = parsedYear;
    }

    const summary = await managerService.getMonthlyProductSummary(year);
    res.json(response.success('Ringkasan produk bulanan berhasil diambil', summary));
  } catch (error) {
    next(error);
  }
};

const createSupervisorValidation = [
  body('phone')
    .notEmpty()
    .withMessage('Nomor telepon wajib diisi')
    .isLength({ min: 10, max: 20 })
    .withMessage('Nomor telepon harus antara 10 hingga 20 karakter'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Kata sandi harus memiliki minimal 6 karakter'),
  body('name')
    .notEmpty()
    .withMessage('Nama wajib diisi')
    .isLength({ min: 2, max: 100 })
    .withMessage('Nama harus antara 2 hingga 100 karakter'),
  body('storeId')
    .notEmpty()
    .withMessage('ID toko wajib diisi')
    .isUUID()
    .withMessage('ID toko harus berupa UUID yang valid'),
  body().custom((_, { req }) => {
    if (req.body.store) {
      throw new Error('Pembuatan toko tidak lagi didukung pada endpoint ini');
    }

    if (typeof req.body.storeIds !== 'undefined') {
      throw new Error('storeIds tidak lagi didukung; gunakan satu storeId sebagai gantinya');
    }

    return true;
  }),
];

const createSupervisor = async (req, res, next) => {
  try {
    const supervisor = await managerService.createSupervisor(req.body);
    res.status(201).json(response.success('Supervisor berhasil dibuat', supervisor));
  } catch (error) {
    if (error.message === 'Toko tidak ditemukan') {
      return res.status(404).json(response.error('Toko tidak ditemukan'));
    }
    if (error.message === 'Informasi toko wajib diisi') {
      return res.status(400).json(response.error('Informasi toko wajib diisi'));
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
    res.json(response.success('Supervisor berhasil dihapus', result));
  } catch (error) {
    if (error.message === 'Supervisor tidak ditemukan') {
      return res.status(404).json(response.error('Supervisor tidak ditemukan'));
    }
    next(error);
  }
};

const updateSupervisorValidation = [
  body('name')
    .notEmpty()
    .withMessage('Nama wajib diisi')
    .isLength({ min: 2, max: 100 })
    .withMessage('Nama harus antara 2 hingga 100 karakter'),
  body('phone')
    .notEmpty()
    .withMessage('Nomor telepon wajib diisi')
    .isLength({ min: 10, max: 20 })
    .withMessage('Nomor telepon harus antara 10 hingga 20 karakter'),
];

const updateSupervisor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone } = req.body;
    
    const updatedSupervisor = await managerService.updateSupervisor(id, { name, phone });
    res.json(response.success('Supervisor berhasil diperbarui', updatedSupervisor));
  } catch (error) {
    if (error.message === 'Supervisor tidak ditemukan') {
      return res.status(404).json(response.error('Supervisor tidak ditemukan'));
    }
    next(error);
  }
};

const getSupervisors = async (req, res, next) => {
  try {
    const pageInfo = parsePaginationQuery(req.query);
    const where = buildSupervisorFilters(req.query, req.user);
    const result = await managerService.getSupervisors(
      pageInfo.page,
      pageInfo.limit,
      pageInfo.offset,
      pageInfo.sortBy,
      pageInfo.sortOrder,
      where,
    );

    const paginatedResponse = buildPaginatedResponse(result, pageInfo);
    res.json(response.paginated('Data supervisor berhasil diambil', paginatedResponse));
  } catch (error) {
    next(error);
  }
};

const getSalesUsers = async (req, res, next) => {
  try {
    const pageInfo = parsePaginationQuery(req.query);
    const where = buildSalesFilters(req.query, req.user);
    const result = await managerService.getSalesUsers(
      pageInfo.page,
      pageInfo.limit,
      pageInfo.offset,
      pageInfo.sortBy,
      pageInfo.sortOrder,
      where,
    );

    const paginatedResponse = buildPaginatedResponse(result, pageInfo);
    res.json(response.paginated('Data sales berhasil diambil', paginatedResponse));
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
          where['$store.name$'] = storeNameMatcher;
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
    res.json(response.paginated('Produk berhasil diambil', paginatedResponse));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboard,
  createSupervisorValidation,
  createSupervisor,
  updateSupervisorValidation,
  updateSupervisor,
  deleteSupervisor,
  getSupervisors,
  getSalesUsers,
  getProducts,
  getMonthlyProductSummary,
  handleValidationErrors,
};