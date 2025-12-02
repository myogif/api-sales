const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const warrantyRepository = require('../repositories/warranty.repository');
const {
  formatCurrencyDisplay,
  formatFullDateDisplay,
  formatWarrantyPeriod,
} = require('../utils/formatters');
const logger = require('../../../utils/logger');

const templatePath = path.join(__dirname, '../../../..', 'templates', 'template.pdf');
let cachedTemplate = null;

const loadTemplate = async () => {
  if (cachedTemplate) {
    return cachedTemplate;
  }

  try {
    cachedTemplate = await fs.promises.readFile(templatePath);
    return cachedTemplate;
  } catch (error) {
    logger.error('Failed to load warranty template', error);
    throw new Error('Berkas template tidak ditemukan');
  }
};

const mapWarrantyToDisplay = (warranty) => ({
  ...warranty,
  tanggalPembelianDisplay: formatFullDateDisplay(warranty.tanggalPembelian),
  biayaGaransiDisplay: formatCurrencyDisplay(warranty.biayaGaransi),
  periodeGaransiDisplay: formatWarrantyPeriod(
    warranty.periodeMulai,
    warranty.periodeSelesai,
    warranty.periodeDurasiBulan,
  ),
  hargaDisplay: formatCurrencyDisplay(warranty.harga),
});

const createWarrantyFileName = (nomor) => {
  if (!nomor) {
    return 'kartu-garansi.pdf';
  }

  const sanitized = nomor
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `kartu-garansi-${sanitized || 'garansi'}.pdf`;
};
const drawWarrantyDetails = (page, fonts, displayData, pageHeight) => {
  const startY = pageHeight - 250;
  const lineHeight = 24;

  // ===============================
  //  NOMOR (Bold + warna hijau)
  // ===============================
  page.drawText(displayData.nomor || "-", {
    x: 154,
    y: 533,
    size: 8,
    font: fonts.bold,
    color: rgb(0.04, 0.28, 0.15),
  });

  // ===============================
  //  NAMA
  // ===============================
  page.drawText(displayData.nama || "-", {
    x: 154,
    y: 518,
    size: 8,
    font: fonts.regular,
    color: rgb(0.10, 0.10, 0.10),
  });

  // ===============================
  //  EMAIL
  // ===============================
  page.drawText(displayData.email || "-", {
    x: 154,
    y: 504,
    size: 8,
    font: fonts.regular,
    color: rgb(0.10, 0.10, 0.10),
  });

  // ===============================
  //  NOMOR TELEPON
  // ===============================
  page.drawText(displayData.nomorTelepon || "-", {
    x: 154,
    y: 490,
    size: 8,
    font: fonts.regular,
    color: rgb(0.10, 0.10, 0.10),
  });

  // ===============================
  //  TANGGAL PEMBELIAN
  // ===============================
  page.drawText(displayData.tanggalPembelianDisplay || "-", {
    x: 154,
    y: 474,
    size: 8,
    font: fonts.regular,
    color: rgb(0.10, 0.10, 0.10),
  });

  // ===============================
  //  BIAYA GARANSI
  // ===============================
  page.drawText(displayData.biayaGaransiDisplay || "-", {
    x: 154,
    y: 459,
    size: 8,
    font: fonts.regular,
    color: rgb(0.10, 0.10, 0.10),
  });

  // ===============================
  //  PERIODE GARANSI
  // ===============================
  page.drawText(displayData.periodeGaransiDisplay || "-", {
    x: 154,
    y: 445,
    size: 8,
    font: fonts.regular,
    color: rgb(0.10, 0.10, 0.10),
  });
};


const drawProductDetails = (page, fonts, displayData, pageHeight) => {
  const tableTop = pageHeight - 430;
  const rowY = tableTop - 42;

  // ============================
  //  Kolom Statis (x ditentukan)
  // ============================

  // Merek
  page.drawText(displayData.merek || "-", {
    x: 75,      // posisi kolom Merek
    y: rowY,
    size: 8,
    font: fonts.regular,
    color: rgb(0.05, 0.05, 0.05),
  });

  // Tipe
  page.drawText(displayData.tipe || "-", {
    x: 225,     // posisi kolom Tipe
    y: rowY,
    size: 9,
    font: fonts.regular,
    color: rgb(0.05, 0.05, 0.05),
  });

  // Kode Produk
  page.drawText(displayData.kodeProduk || "-", {
    x: 338,     // posisi kolom Kode
    y: rowY,
    size: 9,
    font: fonts.regular,
    color: rgb(0.05, 0.05, 0.05),
  });

  // Harga Display (posisi statis)
  page.drawText(displayData.hargaDisplay || "-", {
    x: 450,     // posisi kolom Harga
    y: rowY,
    size: 9,
    font: fonts.regular,
    color: rgb(0.05, 0.05, 0.05),
  });
};




const renderWarrantyCertificate = async (displayData) => {
  const templateBytes = await loadTemplate();
  const pdfDoc = await PDFDocument.load(templateBytes);

  try {
    pdfDoc.setTitle(`Kartu Garansi+ - ${displayData.nomor || 'GARANSI'}`);
    pdfDoc.setAuthor('Garansi+');
    pdfDoc.setCreator('Garansi+ Certificate Service');
  } catch (error) {
    logger.warn('Failed to set PDF metadata', error);
  }

  const [page] = pdfDoc.getPages();
  const { height } = page.getSize();
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const fonts = {
    regular: regularFont,
    bold: boldFont,
  };

  drawWarrantyDetails(page, fonts, displayData, height);
  drawProductDetails(page, fonts, displayData, height);
  // drawFooterNotes(page, fonts, height);

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
};

const prepareWarrantyCertificate = async (id) => {
  const warranty = await warrantyRepository.findById(id);
  if (!warranty) {
    return null;
  }

  const displayData = mapWarrantyToDisplay(warranty);

  return {
    displayData,
    fileName: createWarrantyFileName(displayData.nomor),
    render: () => renderWarrantyCertificate(displayData),
  };
};

module.exports = {
  prepareWarrantyCertificate,
};
