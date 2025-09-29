const { Op } = require('sequelize');

const buildProductFilters = (query, user, sequelize) => {
  const where = {};
  
  // Text search in name, code, notes
  if (query.q) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${query.q}%` } },
      { code: { [Op.iLike]: `%${query.q}%` } },
      { notes: { [Op.iLike]: `%${query.q}%` } },
    ];
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
      where['$store.name$'] = { [Op.iLike]: `%${trimmedStoreName}%` };
    }
  }
  
  // Date range filters
  if (query.created_at_from || query.created_at_to) {
    const dateFilter = {};
    if (query.created_at_from) {
      dateFilter[Op.gte] = query.created_at_from;
    }
    if (query.created_at_to) {
      dateFilter[Op.lte] = query.created_at_to;
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
};