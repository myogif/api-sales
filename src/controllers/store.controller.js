const storeService = require('../services/store.service');

const checkStoreLimit = async (req, res, next) => {
  try {
    const { total, limit, canCreate } = await storeService.checkLimit();
    res.json({
      total,
      limit,
      can_create: canCreate,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  checkStoreLimit,
};
