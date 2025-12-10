const { body, param } = require('express-validator');
const serviceCenterService = require('../services/service-center.service');
const response = require('../utils/response');
const { handleValidationErrors } = require('../middlewares/validate');
const { formatProductForOutput } = require('../utils/product-pricing');

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

const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await serviceCenterService.updateProduct(id, req.body);
    res.json(response.success('Produk berhasil diperbarui', formatProductForOutput(product)));
  } catch (error) {
    if (error.message === 'Produk tidak ditemukan') {
      return res.status(404).json(response.error('Produk tidak ditemukan'));
    }
    next(error);
  }
};

module.exports = {
  updateProductValidation,
  updateProduct,
  handleValidationErrors,
};
