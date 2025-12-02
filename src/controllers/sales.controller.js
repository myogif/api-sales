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
    .withMessage('Nama produk wajib diisi')
    .isLength({ min: 2, max: 200 })
    .withMessage('Nama produk harus antara 2 hingga 200 karakter'),
  body('tipe')
    .notEmpty()
    .withMessage('Tipe produk wajib diisi')
    .isLength({ max: 100 })
    .withMessage('Tipe produk tidak boleh lebih dari 100 karakter'),
  body('code')
    .notEmpty()
    .withMessage('Kode produk wajib diisi')
    .isLength({ min: 2, max: 50 })
    .withMessage('Kode produk harus antara 2 hingga 50 karakter'),
  body('price')
    .notEmpty()
    .withMessage('Harga wajib diisi')
    .isFloat({ min: 0 })
    .withMessage('Harga harus berupa angka tidak negatif')
    .toFloat(),
  body('persen')
    .notEmpty()
    .withMessage('Persen wajib diisi')
    .isFloat({ gt: 0 })
    .withMessage('Persen harus berupa angka positif')
    .toFloat(),
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Catatan tidak boleh lebih dari 1000 karakter'),
  body('customer_name')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Nama pelanggan tidak boleh lebih dari 200 karakter'),
  body('customer_phone')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Nomor telepon pelanggan tidak boleh lebih dari 50 karakter'),
  body()
    .custom((value, { req }) => {
      const phone = req.body.customer_phone ?? req.body.customerPhone;

      if (phone === undefined || phone === null || String(phone).trim() === '') {
        throw new Error('Nomor telepon pelanggan wajib diisi');
      }

      return true;
    }),
  body('customer_email')
    .optional()
    .isEmail()
    .withMessage('Email pelanggan harus berupa alamat email yang valid')
    .isLength({ max: 150 })
    .withMessage('Email pelanggan tidak boleh lebih dari 150 karakter'),
  body('invoice_number')
    .notEmpty()
    .withMessage('Nomor nota wajib diisi')
    .isString()
    .withMessage('Nomor nota harus berupa string'),
  body('warranty_months')
    .notEmpty()
    .withMessage('Lama garansi (bulan) wajib diisi')
    .isInt({ gt: 0 })
    .withMessage('Lama garansi (bulan) harus berupa bilangan bulat positif'),
  body('price_warranty')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Harga garansi harus berupa angka tidak negatif')
    .toFloat(),
];

const createProduct = async (req, res, next) => {
  try {
    const creatorId = req.user.sub;
    const storeId = req.user.store_id;

    const product = await salesService.createProduct(creatorId, storeId, req.body);
    res.status(201).json(
      response.success('Produk berhasil dibuat', formatProductForOutput(product)),
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
      return res.status(404).json(response.error('Toko tidak ditemukan'));
    }

    next(error);
  }
};

const updateProductValidation = [
  param('id')
    .isUUID()
    .withMessage('ID produk harus berupa UUID yang valid'),
  body('isActive')
    .exists()
    .withMessage('isActive wajib diisi')
    .isBoolean()
    .withMessage('isActive harus berupa boolean')
    .toBoolean()
    .custom((value) => {
      if (value !== false) {
        throw new Error('Produk hanya dapat dinonaktifkan (isActive harus bernilai false)');
      }
      return true;
    }),
  body()
    .custom((value, { req }) => {
      const allowedFields = ['isActive'];
      const invalidFields = Object.keys(req.body).filter((field) => !allowedFields.includes(field));

      if (invalidFields.length > 0) {
        throw new Error('Hanya isActive yang dapat diperbarui untuk produk');
      }

      return true;
    }),
];

const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const creatorId = req.user.sub;

    const result = await salesService.deleteProduct(id, creatorId);
    res.json(response.success('Produk berhasil dihapus', result));
  } catch (error) {
    if (error.message === 'Produk tidak ditemukan') {
      return res.status(404).json(response.error('Produk tidak ditemukan'));
    }
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const creatorId = req.user.sub;

    const product = await salesService.updateProduct(id, creatorId, req.body);
    res.json(response.success('Produk berhasil diperbarui', formatProductForOutput(product)));
  } catch (error) {
    if (error.message === 'Produk tidak ditemukan') {
      return res.status(404).json(response.error('Produk tidak ditemukan'));
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
    res.json(response.paginated('Produk berhasil diambil', paginatedResponse));
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
