const toNumberOrZero = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const toNullableNumber = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

const roundToTwoDecimals = (value) => {
  return Math.round((value + Number.EPSILON) * 100) / 100;
};

const DEFAULT_WARRANTY_PRICE = 100000;
const SIX_MONTHS = 6;
const TWELVE_MONTHS = 12;
const DEFAULT_STATUS_DURATION_MONTHS = 6;

const normalizePersen = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

// Deprecated: price_warranty is now provided directly from the request/DB.
// Do not use this helper for new flows.
const calculatePriceWarranty = (price, persen) => {
  const normalizedPrice = toNumberOrZero(price);
  const normalizedPersen = normalizePersen(persen);

  if (normalizedPersen === null || normalizedPersen === 0) {
    return roundToTwoDecimals(DEFAULT_WARRANTY_PRICE);
  }

  if (normalizedPersen === 3) {
    return roundToTwoDecimals(normalizedPrice * 0.03);
  }

  if (normalizedPersen === 5) {
    return roundToTwoDecimals(normalizedPrice * 0.05);
  }

  const warrantyPrice = normalizedPrice * (normalizedPersen / 100);

  return roundToTwoDecimals(warrantyPrice);
};

const calculateWarrantyDurationMonths = (persen) => {
  const normalizedPersen = normalizePersen(persen);

  if (normalizedPersen === 5) {
    return TWELVE_MONTHS;
  }

  return SIX_MONTHS;
};

const getStatusDurationMonths = (persen) => {
  const normalizedPersen = normalizePersen(persen);

  if (normalizedPersen === 5) {
    return SIX_MONTHS;
  }

  if (normalizedPersen === 3) {
    return 3;
  }

  return DEFAULT_STATUS_DURATION_MONTHS;
};

const calculateAgeInMonths = (createdAt) => {
  const createdDate = createdAt instanceof Date ? createdAt : new Date(createdAt);

  if (Number.isNaN(createdDate.getTime())) {
    return null;
  }

  const now = new Date();
  const yearsDiff = now.getFullYear() - createdDate.getFullYear();
  const monthsDiff = now.getMonth() - createdDate.getMonth();
  const daysDiff = now.getDate() - createdDate.getDate();

  return yearsDiff * 12 + monthsDiff + daysDiff / 30;
};

const determineStatus = (product) => {
  const plainProduct = toPlainProduct(product);

  if (!plainProduct) {
    return null;
  }

  const ageInMonths = calculateAgeInMonths(plainProduct.createdAt);
  const allowedDuration = getStatusDurationMonths(plainProduct.persen);

  if (ageInMonths === null) {
    return plainProduct.isActive ? 'Aktif' : 'Expired';
  }

  const isWithinDuration = ageInMonths < allowedDuration;

  if (plainProduct.isActive && !isWithinDuration) {
    return 'Expired';
  }

  if (!plainProduct.isActive && isWithinDuration) {
    return 'Used';
  }

  if (plainProduct.isActive && isWithinDuration) {
    return 'Aktif';
  }

  return 'Expired';
};

const toPlainProduct = (product) => {
  if (!product) {
    return product;
  }

  if (typeof product.get === 'function') {
    return product.get({ plain: true });
  }

  return product;
};

const formatProductForOutput = (product) => {
  const plainProduct = toPlainProduct(product);
  if (!plainProduct) {
    return plainProduct;
  }

  const price = toNullableNumber(plainProduct.price);
  const persen = toNullableNumber(plainProduct.persen);
  const priceWarranty = toNullableNumber(
    plainProduct.priceWarranty ?? plainProduct.price_warranty,
  );
  const status = determineStatus(plainProduct);

  return {
    ...plainProduct,
    price,
    persen,
    priceWarranty,
    status,
  };
};

module.exports = {
  calculatePriceWarranty,
  calculateWarrantyDurationMonths,
  determineStatus,
  formatProductForOutput,
};
