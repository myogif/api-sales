const express = require('express');
const { authenticate } = require('../middlewares/auth');
const { requireSales } = require('../middlewares/role');
const {
  createProductValidation,
  createProduct,
  deleteProduct,
  getProducts,
  handleValidationErrors,
} = require('../controllers/sales.controller');

const router = express.Router();

// Apply authentication and sales role to all routes
router.use(authenticate, requireSales);

/**
 * @swagger
 * /api/sales/products:
 *   post:
 *     summary: Create a product
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProductRequest'
 *     responses:
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductResponse'
 */
router.post('/products', createProductValidation, handleValidationErrors, createProduct);

/**
 * @swagger
 * /api/sales/products/{id}:
 *   delete:
 *     summary: Delete a product (only own products)
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.delete('/products/:id', deleteProduct);

/**
 * @swagger
 * /api/sales/products:
 *   get:
 *     summary: Get products (store products or own products with ?mine=true)
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SortByParam'
 *       - $ref: '#/components/parameters/SortOrderParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *       - $ref: '#/components/parameters/SkuParam'
 *       - $ref: '#/components/parameters/PurchasedFromParam'
 *       - $ref: '#/components/parameters/PurchasedToParam'
 *       - $ref: '#/components/parameters/MineParam'
 *       - $ref: '#/components/parameters/ExportParam'
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedProductsResponse'
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/products', getProducts);

module.exports = router;