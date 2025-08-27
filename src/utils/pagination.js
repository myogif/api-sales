const parsePaginationQuery = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
  const sortBy = query.sortBy || 'createdAt';
  const sortOrder = (query.sortOrder || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';
  
  const offset = (page - 1) * limit;
  
  return {
    page,
    limit,
    offset,
    sortBy,
    sortOrder,
  };
};

const applyPaginationToFindOptions = (options, pageInfo) => ({
  ...options,
  limit: pageInfo.limit,
  offset: pageInfo.offset,
  order: [[pageInfo.sortBy, pageInfo.sortOrder.toUpperCase()]],
});

const buildPaginatedResponse = (result, pageInfo) => {
  const { count, rows } = result;
  const totalPages = Math.ceil(count / pageInfo.limit);
  
  return {
    items: rows,
    pagination: {
      currentPage: pageInfo.page,
      totalPages,
      totalItems: count,
      itemsPerPage: pageInfo.limit,
      hasNextPage: pageInfo.page < totalPages,
      hasPrevPage: pageInfo.page > 1,
    },
  };
};

module.exports = {
  parsePaginationQuery,
  applyPaginationToFindOptions,
  buildPaginatedResponse,
};