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

const calculatePriceWarranty = (price, persen) => {
  const normalizedPrice = toNumberOrZero(price);
  const normalizedPersen = toNumberOrZero(persen);

  const warrantyPrice = normalizedPrice * (normalizedPersen / 100);

  return roundToTwoDecimals(warrantyPrice);
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
  formatProductForOutput,
};
