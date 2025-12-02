const express = require('express');
const { authenticate } = require('../middlewares/auth');
const { requireManagerOrServiceCenter } = require('../middlewares/role');
const { checkProductLimit } = require('../controllers/product.controller');

const router = express.Router();

router.use(authenticate);

/**
 * @swagger
 * /api/produk/{store_id}/check-limit:
 *   get:
 *     summary: Check global product creation limit
 *     tags: [Product]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: store_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Returns the current number of products and whether new products can be created.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 store_id:
 *                   type: string
 *                   format: uuid
 *                   example: "11111111-1111-1111-1111-111111111111"
 *                 total:
 *                   type: integer
 *                   example: 5340
 *                 limit:
 *                   type: integer
 *                   example: 10000000
 *                 can_create:
 *                   type: boolean
 *                   example: true
 *       404:
 *         description: Toko tidak ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:store_id/check-limit', requireManagerOrServiceCenter, checkProductLimit);

module.exports = router;
