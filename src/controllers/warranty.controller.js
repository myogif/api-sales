const { PassThrough } = require('stream');
const { prepareWarrantyCertificate } = require('../modules/warranty/services/warrantyCertificate.service');
const logger = require('../utils/logger');

const streamWarrantyCertificate = async (req, res) => {
  try {
    const { id } = req.params;
    const certificate = await prepareWarrantyCertificate(id);

    if (!certificate) {
      return res.status(404).json({ message: 'Data garansi tidak ditemukan' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${certificate.fileName}"`);

    const pdfBuffer = await certificate.render();
    const stream = new PassThrough();
    stream.end(pdfBuffer);
    stream.pipe(res);

    return null;
  } catch (error) {
    logger.error('Failed to generate warranty certificate', error);
    if (!res.headersSent) {
      return res.status(500).json({ message: 'Failed to generate certificate' });
    }
    res.end();
    return null;
  }
};

module.exports = {
  streamWarrantyCertificate,
};
