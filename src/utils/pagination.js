const parsePaginationQuery = (query) => {
  const rawPage = query.page;
  const rawLimit = query.limit;

  // Jika page dan limit keduanya tidak diisi (undefined/kosong string), ambil semua data
  const isPaginationEmpty =
    (rawPage === undefined || rawPage === '' || rawPage === null) &&
    (rawLimit === undefined || rawLimit === '' || rawLimit === null);

  if (isPaginationEmpty) {
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = (query.sortOrder || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';
    return {
      fetchAll: true,
      page: 1,
      limit: null,
      offset: 0,
      sortBy,
      sortOrder,
    };
  }

  const page = Math.max(1, parseInt(rawPage, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(rawLimit, 10) || 10));
  const sortBy = query.sortBy || 'createdAt';
  const sortOrder = (query.sortOrder || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

  const offset = (page - 1) * limit;

  return {
    fetchAll: false,
    page,
    limit,
    offset,
    sortBy,
    sortOrder,
  };
};

const applyPaginationToFindOptions = (options, pageInfo) => {
  const findOptions = {
    ...options,
    order: [[pageInfo.sortBy, pageInfo.sortOrder.toUpperCase()]],
  };

  // Jika fetchAll = true, tidak tambahkan limit/offset agar Sequelize mengambil semua data
  if (!pageInfo.fetchAll) {
    findOptions.limit = pageInfo.limit;
    findOptions.offset = pageInfo.offset;
  }

  return findOptions;
};

const buildPaginatedResponse = (result, pageInfo) => {
  const { count, rows } = result;

  if (pageInfo.fetchAll) {
    return {
      items: rows,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: count,
        itemsPerPage: count,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  }

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