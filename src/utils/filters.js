const { Op } = require('sequelize');

const buildProductFilters = (query, user, sequelize) => {
  const where = {};
  
  // Text search in name, sku, notes
  if (query.q) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${query.q}%` } },
      { sku: { [Op.iLike]: `%${query.q}%` } },
      { notes: { [Op.iLike]: `%${query.q}%` } },
    ];
  }
  
  // Exact SKU match
  if (query.sku) {
    where.sku = query.sku;
  }
  
  // Store filter
  if (query.store_id) {
    where.storeId = query.store_id;
  }
  
  // Date range filters
  if (query.purchased_from || query.purchased_to) {
    const dateFilter = {};
    if (query.purchased_from) {
      dateFilter[Op.gte] = query.purchased_from;
    }
    if (query.purchased_to) {
      dateFilter[Op.lte] = query.purchased_to;
    }
    where.purchasedAt = dateFilter;
  }
  
  // Creator filter
  if (query.creator_id) {
    where.creatorId = query.creator_id;
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