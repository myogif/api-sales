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
    throw new Error('Template file not found');
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
  const startY = pageHeight - 160;
  const lineHeight = 24;
  const detailValues = [
    displayData.nomor,
    displayData.nama,
    displayData.email,
    displayData.nomorTelepon,
    displayData.tanggalPembelianDisplay,
    displayData.biayaGaransiDisplay,
    displayData.periodeGaransiDisplay,
  ];

  detailValues.forEach((value, index) => {
    const y = startY - index * lineHeight;
    const font = index === 0 ? fonts.bold : fonts.regular;
    const color = index === 0 ? rgb(0.04, 0.28, 0.15) : rgb(0.10, 0.10, 0.10);
    page.drawText(value || '-', {
      x: 220,
      y,
      size: 12,
      font,
      color,
    });
  });
};

const drawProductDetails = (page, fonts, displayData, pageHeight) => {
  const tableTop = pageHeight - 380;
  const rowY = tableTop - 42;
  const { width } = page.getSize();
  const columnWidth = (width - 100) / 4;
  const columns = [
    displayData.merek,
    displayData.tipe,
    displayData.kodeProduk,
    displayData.hargaDisplay,
  ];

  columns.forEach((value, index) => {
    const x = 50 + columnWidth * index + 15;
    page.drawText(value || '-', {
      x,
      y: rowY,
      size: 12,
      font: fonts.regular,
      color: rgb(0.05, 0.05, 0.05),
    });
  });
};

const drawFooterNotes = (page, fonts, pageHeight) => {
  const notesY = pageHeight - 470;
  page.drawText('Dicetak otomatis oleh sistem Garansi+', {
    x: 50,
    y: notesY,
    size: 10,
    font: fonts.regular,
    color: rgb(0.30, 0.30, 0.30),
  });

  page.drawText(new Date().toISOString().slice(0, 10), {
    x: 50,
    y: notesY - 16,
    size: 10,
    font: fonts.regular,
    color: rgb(0.30, 0.30, 0.30),
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
  drawFooterNotes(page, fonts, height);

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
};

const prepareWarrantyCertificate = async (id) => {
  const warranty = warrantyRepository.findById(id);
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
