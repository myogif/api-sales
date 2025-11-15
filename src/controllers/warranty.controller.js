const { prepareWarrantyCertificate } = require('../modules/warranty/services/warrantyCertificate.service');
const logger = require('../utils/logger');

const streamWarrantyCertificate = (req, res) => {
  try {
    const { id } = req.params;
    const certificate = prepareWarrantyCertificate(id);

    if (!certificate) {
      return res.status(404).json({ message: 'Data garansi tidak ditemukan' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${certificate.fileName}"`);

    certificate.streamTo(res);

    return null;
  } catch (error) {
    logger.error('Failed to generate warranty certificate', error);
    return res.status(500).json({ message: 'Failed to generate certificate' });
  }
};

module.exports = {
  streamWarrantyCertificate,
};
