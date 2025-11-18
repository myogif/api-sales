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

const normalizePersen = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

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
  const priceWarranty = calculatePriceWarranty(price ?? 0, persen ?? 0);

  return {
    ...plainProduct,
    price,
    persen,
    priceWarranty,
  };
};

module.exports = {
  calculatePriceWarranty,
  calculateWarrantyDurationMonths,
  formatProductForOutput,
};
