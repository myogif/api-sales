const express = require('express');
const { authenticate } = require('../middlewares/auth');
const { requireManagerOrServiceCenter } = require('../middlewares/role');
const { checkStoreLimit } = require('../controllers/store.controller');

const router = express.Router();

router.use(authenticate);

/**
 * @swagger
 * /api/toko/check-limit:
 *   get:
 *     summary: Check toko creation limit
 *     tags: [Store]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Returns the current number of stores and whether new stores can be created.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                   example: 125
 *                 limit:
 *                   type: integer
 *                   example: 300
 *                 can_create:
 *                   type: boolean
 *                   example: true
 */
router.get('/check-limit', requireManagerOrServiceCenter, checkStoreLimit);

module.exports = router;
