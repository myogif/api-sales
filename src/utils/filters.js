const { Op, fn, col, where: buildWhere } = require('sequelize');

const buildCaseInsensitiveLike = (columnPath, value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = value.toLowerCase();
  const likeValue = `%${normalizedValue}%`;

  return buildWhere(fn('LOWER', col(columnPath)), { [Op.like]: likeValue });
};

const buildProductFilters = (query, user, sequelize) => {
  const where = {};

  // Text search in name, code, notes
  if (query.q) {
    const caseInsensitiveMatchers = [
      buildCaseInsensitiveLike('name', query.q),
      buildCaseInsensitiveLike('code', query.q),
      buildCaseInsensitiveLike('notes', query.q),
    ].filter(Boolean);

    if (caseInsensitiveMatchers.length > 0) {
      where[Op.or] = caseInsensitiveMatchers;
    }
  }
  
  // Exact code match
  if (query.code) {
    where.code = query.code;
  }
  
  // Store filters
  if (query.store_id) {
    where.storeId = query.store_id;
  }

  if (typeof query.store_name === 'string') {
    const trimmedStoreName = query.store_name.trim();
    if (trimmedStoreName) {
      const storeNameMatcher = buildCaseInsensitiveLike('store.name', trimmedStoreName);
      if (storeNameMatcher) {
        where['$store.name$'] = storeNameMatcher;
      }
    }
  }
  
  // Date range filters
  if (query.created_at_from || query.created_at_to) {
    const dateFilter = {};

    if (query.created_at_from) {
      const fromDate = new Date(query.created_at_from);
      if (!Number.isNaN(fromDate.getTime())) {
        fromDate.setHours(0, 0, 1, 0);
        dateFilter[Op.gte] = fromDate;
      } else {
        dateFilter[Op.gte] = query.created_at_from;
      }
    }

    if (query.created_at_to) {
      const toDate = new Date(query.created_at_to);
      if (!Number.isNaN(toDate.getTime())) {
        toDate.setHours(23, 59, 59, 999);
        dateFilter[Op.lte] = toDate;
      } else {
        dateFilter[Op.lte] = query.created_at_to;
      }
    }

    where.createdAt = dateFilter;
  }
  
  // Creator filter
  if (query.creator_id) {
    where.creatorId = query.creator_id;
  }

  if (query.supervisor_id) {
    where['$creator.supervisorId$'] = query.supervisor_id;
  }

  // Mine filter (only for SALES role)
  if (query.mine === 'true' && user.role === 'SALES') {
    where.creatorId = user.sub;
  }
  
  // Role-based access control
  switch (user.role) {
    case 'SUPERVISOR':
      // Supervisors can only see products from their store
      where.storeId = user.store_id;
      break;
    case 'SALES':
      // Sales can see products from their store unless using "mine" filter
      if (query.mine !== 'true') {
        where.storeId = user.store_id;
      }
      break;
    case 'MANAGER':
    case 'SERVICE_CENTER':
      // Managers can see all products (no additional filter)
      break;
    default:
      // Default: no products
      where.id = null;
  }
  
  return where;
};

module.exports = {
  buildProductFilters,
  buildCaseInsensitiveLike,
};
