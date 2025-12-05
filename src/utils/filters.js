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

  const normalizedRole = typeof user?.role === 'string'
    ? user.role.toUpperCase()
    : undefined;

  // Text search in name, code, notes
  if (query.q) {
    const caseInsensitiveMatchers = [
      buildCaseInsensitiveLike('Product.name', query.q),
      buildCaseInsensitiveLike('Product.code', query.q),
      buildCaseInsensitiveLike('Product.customer_phone', query.q),
      buildCaseInsensitiveLike('Product.notes', query.q),
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
        const andConditions = where[Op.and] || [];
        andConditions.push(storeNameMatcher);
        where[Op.and] = andConditions;
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
  if (query.mine === 'true' && normalizedRole === 'SALES' && user?.sub) {
    where.creatorId = user.sub;
  }

  // Role-based access control
  switch (normalizedRole) {
    case 'SUPERVISOR':
      // Supervisors can only see products from their store
      if (user?.store_id) {
        where.storeId = user.store_id;
      }
      break;
    case 'SALES':
      // Sales can see products from their store unless using "mine" filter
      if (query.mine !== 'true' && user?.store_id) {
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

const buildSupervisorFilters = (query, user, sequelize) => {
  const where = { role: 'SUPERVISOR' };

  const normalizedRole = typeof user?.role === 'string'
    ? user.role.toUpperCase()
    : undefined;

  if (query.q) {
    const searchMatchers = [
      buildCaseInsensitiveLike('User.name', query.q),
      buildCaseInsensitiveLike('User.phone', query.q),
      buildCaseInsensitiveLike('store.name', query.q),
    ].filter(Boolean);

    if (searchMatchers.length) {
      where[Op.or] = searchMatchers;
    }
  }

  if (query.store_id) {
    where.storeId = query.store_id;
  }

  switch (normalizedRole) {
    case 'MANAGER':
    case 'SERVICE_CENTER':
      break;
    case 'SUPERVISOR':
      if (user?.store_id) {
        where.storeId = user.store_id;
      } else {
        where.id = null;
      }
      break;
    default:
      where.id = null;
  }

  return where;
};

const buildSalesFilters = (query, user, sequelize) => {
  const where = { role: 'SALES' };

  const normalizedRole = typeof user?.role === 'string'
    ? user.role.toUpperCase()
    : undefined;

  if (query.q) {
    const searchMatchers = [
      buildCaseInsensitiveLike('User.name', query.q),
      buildCaseInsensitiveLike('User.phone', query.q),
      buildCaseInsensitiveLike('store.name', query.q),
    ].filter(Boolean);

    if (searchMatchers.length) {
      where[Op.or] = searchMatchers;
    }
  }

  if (query.store_id) {
    where.storeId = query.store_id;
  }

  if (query.supervisor_id) {
    where.supervisorId = query.supervisor_id;
  }

  if (query.mine === 'true' && normalizedRole === 'SALES' && user?.sub) {
    where.id = user.sub;
  }

  switch (normalizedRole) {
    case 'MANAGER':
    case 'SERVICE_CENTER':
      break;
    case 'SUPERVISOR':
      if (user?.store_id) {
        where.storeId = user.store_id;
      } else {
        where.id = null;
      }
      break;
    case 'SALES':
      if (query.mine === 'true' && user?.sub) {
        where.id = user.sub;
      } else if (user?.store_id) {
        where.storeId = user.store_id;
      } else {
        where.id = null;
      }
      break;
    default:
      where.id = null;
  }

  return where;
};

const buildStoreFilters = (query, user, sequelize) => {
  const where = {};

  if (query.q) {
    const searchMatchers = [
      buildCaseInsensitiveLike('Store.name', query.q),
      buildCaseInsensitiveLike('Store.kode_toko', query.q),
    ].filter(Boolean);

    if (searchMatchers.length) {
      where[Op.or] = searchMatchers;
    }
  }

  if (query.store_id) {
    where.id = query.store_id;
  }

  if (query.creator_id) {
    where.creatorId = query.creator_id;
  }

  return where;
};

module.exports = {
  buildProductFilters,
  buildSupervisorFilters,
  buildSalesFilters,
  buildStoreFilters,
  buildCaseInsensitiveLike,
};
