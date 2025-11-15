const PDFDocument = require('pdfkit');
const { PassThrough } = require('stream');
const generateWarrantyPdf = require('../pdf/warrantyPdfGenerator');
const warrantyRepository = require('../repositories/warranty.repository');
const {
  formatCurrencyDisplay,
  formatFullDateDisplay,
  formatWarrantyPeriod,
} = require('../utils/formatters');
const logger = require('../../../utils/logger');

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

const prepareWarrantyCertificate = (id) => {
  const warranty = warrantyRepository.findById(id);
  if (!warranty) {
    return null;
  }

  const displayData = mapWarrantyToDisplay(warranty);

  const streamTo = (response) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = new PassThrough();

    doc.info = {
      Title: `Kartu Garansi + - ${displayData.nomor}`,
      Author: 'Garansi+',
      Creator: 'Garansi+ Certificate Service',
    };

    const handleStreamError = (error) => {
      if (!stream.destroyed) {
        stream.destroy(error);
      }

      if (!doc.destroyed) {
        doc.destroy(error);
      }

      logger.error('Failed to stream warranty certificate', error);

      if (!response.headersSent) {
        response.status(500).json({ message: 'Failed to generate certificate' });
      } else if (!response.writableEnded) {
        response.destroy(error);
      }
    };

    doc.once('error', handleStreamError);
    stream.once('error', handleStreamError);

    const handleResponseClose = () => {
      if (!response.writableEnded) {
        if (!stream.destroyed) {
          stream.destroy();
        }

        if (!doc.destroyed) {
          doc.destroy();
        }
      }
    };

    response.once('close', handleResponseClose);
    response.once('finish', () => {
      response.removeListener('close', handleResponseClose);
      stream.removeListener('error', handleStreamError);
      doc.removeListener('error', handleStreamError);
    });

    stream.pipe(response);
    doc.pipe(stream);

    try {
      generateWarrantyPdf(doc, displayData);
      doc.end();
    } catch (error) {
      handleStreamError(error);
    }
  };

  return {
    displayData,
    fileName: createWarrantyFileName(displayData.nomor),
    streamTo,
  };
};

module.exports = {
  prepareWarrantyCertificate,
};
