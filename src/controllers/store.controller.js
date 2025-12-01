const storeService = require('../services/store.service');
const response = require('../utils/response');
const logger = require('../utils/logger');
const { parsePaginationQuery, buildPaginatedResponse } = require('../utils/pagination');
const { buildStoreFilters } = require('../utils/filters');

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

const getStoresPaginated = async (req, res, next) => {
  try {
    const pageInfo = parsePaginationQuery(req.query);
    const where = buildStoreFilters(req.query, req.user);

    const result = await storeService.getPaginatedStores({
      limit: pageInfo.limit,
      offset: pageInfo.offset,
      sortBy: pageInfo.sortBy,
      sortOrder: pageInfo.sortOrder,
      where,
    });

    const paginatedResponse = buildPaginatedResponse(result, pageInfo);
    res.json(response.paginated('Stores retrieved successfully', paginatedResponse));
  } catch (error) {
    next(error);
  }
};

const getAllStores = async (req, res, next) => {
  try {
    const stores = await storeService.getAllStores();
    res.json(response.success('Stores fetched successfully', stores));
  } catch (error) {
    next(error);
  }
};

const createStore = async (req, res, next) => {
  try {
    const store = await storeService.createStore(req.body);

    logger.info('Store created:', { storeId: store.id, storeName: store.name });

    res.status(201).json(response.success('Store created successfully', store));
  } catch (error) {
    if (error.code === storeService.STORE_LIMIT_ERROR_CODE) {
      return res.status(422).json({
        status: false,
        message: storeService.limitReachedMessage,
        data: null,
      });
    }
    next(error);
  }
};

const deleteStore = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await storeService.deleteStore(id);

    res.json(response.success('Store deleted successfully', result));
  } catch (error) {
    if (error.code === storeService.STORE_NOT_FOUND_ERROR_CODE) {
      return res.status(404).json(response.error('Store not found'));
    }
    next(error);
  }
};

module.exports = {
  checkStoreLimit,
  getStoresPaginated,
  getAllStores,
  createStore,
  deleteStore,
};
