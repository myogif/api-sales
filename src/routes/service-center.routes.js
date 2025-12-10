const express = require('express');
const { authenticate } = require('../middlewares/auth');
const { requireServiceCenter } = require('../middlewares/role');
const {
  updateProductValidation,
  updateProduct,
  handleValidationErrors,
} = require('../controllers/service-center.controller');

const router = express.Router();

// Apply authentication and service center role to all routes
router.use(authenticate, requireServiceCenter);

/**
 * @swagger
 * /api/service-center/products/{id}:
 *   put:
 *     summary: Update a product (SERVICE_CENTER role)
 *     description: Allows SERVICE_CENTER role to deactivate products by setting isActive to false
 *     tags: [Service Center]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isActive
 *             properties:
 *               isActive:
 *                 type: boolean
 *                 example: false
 *                 description: Must be false (deactivation only)
 *     responses:
 *       200:
 *         description: Produk berhasil diperbarui
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Produk berhasil diperbarui
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       404:
 *         description: Produk tidak ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/products/:id', updateProductValidation, handleValidationErrors, updateProduct);

module.exports = router;
