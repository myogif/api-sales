const { Product } = require('../../../models');
const {
  calculateWarrantyDurationMonths,
} = require('../../../utils/product-pricing');

const addMonths = (date, months) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }

  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

const toDateOrNull = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const findById = async (id) => {
  const product = await Product.findByPk(id);

  if (!product) {
    return null;
  }

  const plainProduct = product.get({ plain: true });
  const harga = Number(plainProduct.price) || 0;
  const persen = plainProduct.persen;
  const biayaGaransi = Number(plainProduct.priceWarranty ?? plainProduct.price_warranty) || 0;
  const periodeDurasiBulan = calculateWarrantyDurationMonths(persen);
  const tanggalPembelian = toDateOrNull(plainProduct.createdAt) || new Date();
  const periodeMulai = tanggalPembelian;
  const periodeSelesai = addMonths(periodeMulai, periodeDurasiBulan);

  return {
    id: plainProduct.id,
    nomor: plainProduct.nomorKepesertaan,
    nama: plainProduct.customerName,
    email: plainProduct.customerEmail,
    nomorTelepon: plainProduct.customerPhone,
    tanggalPembelian,
    biayaGaransi,
    periodeMulai,
    periodeSelesai,
    periodeDurasiBulan,
    merek: plainProduct.name,
    tipe: plainProduct.tipe,
    kodeProduk: plainProduct.code,
    harga,
  };
};

module.exports = {
  findById,
};
