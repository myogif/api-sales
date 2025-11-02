const productService = require('../services/product.service');
const response = require('../utils/response');
const { STORE_NOT_FOUND_ERROR_CODE } = require('../services/store.service');

const checkProductLimit = async (req, res, next) => {
  try {
    const { store_id: storeId } = req.params;

    await productService.ensureStoreExists(storeId);
    const { total, limit, canCreate } = await productService.checkLimit();

    res.json({
      store_id: storeId,
      total,
      limit,
      can_create: canCreate,
    });
  } catch (error) {
    if (error.code === STORE_NOT_FOUND_ERROR_CODE) {
      return res.status(404).json(response.error('Store not found'));
    }
    next(error);
  }
};

module.exports = {
  checkProductLimit,
};
