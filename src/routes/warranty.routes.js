const express = require('express');
const warrantyController = require('../controllers/warranty.controller');

const router = express.Router();

router.get('/warranties/:id/certificate', warrantyController.streamWarrantyCertificate);

module.exports = router;
