const express = require('express');
const { authenticate } = require('../middlewares/auth');
const { requireSupervisor } = require('../middlewares/role');
const {
  createSalesValidation,
  createSalesUser,
  deleteSalesUser,
  deleteProduct,
  getSalesUsers,
  getProducts,
  handleValidationErrors,
} = require('../controllers/supervisor.controller');

const router = express.Router();

// Apply authentication and supervisor role to all routes
router.use(authenticate, requireSupervisor);

/**
 * @swagger
 * /api/supervisors/sales:
 *   post:
 *     summary: Create a sales user
 *     tags: [Supervisor]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSalesRequest'
 *     responses:
 *       201:
 *         description: Sales berhasil dibuat
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       422:
 *         description: Sales creation is not allowed due to store limit
 *         content:
 *           application/json:
 *             examples:
 *               limitReached:
 *                 summary: Sales limit reached
 *                 value:
 *                   status: false
 *                   message: Jumlah Sales SUdah Mencapai Limit
 *                   data: null
 */
router.post('/sales', createSalesValidation, handleValidationErrors, createSalesUser);

/**
 * @swagger
 * /api/supervisors/sales/{id}:
 *   delete:
 *     summary: Deactivate a sales user
 *     description: Deactivates a sales user by setting isActive to false instead of permanently deleting
 *     tags: [Supervisor]
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
 *         description: Sales berhasil dinonaktifkan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.delete('/sales/:id', deleteSalesUser);

/**
 * @swagger
 * /api/supervisors/sales:
 *   get:
 *     summary: Get sales users in supervisor's store
 *     tags: [Supervisor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Data sales berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UsersResponse'
 */
router.get('/sales', getSalesUsers);

/**
 * @swagger
 * /api/supervisors/products:
 *   get:
 *     summary: Get products in supervisor's store
 *     tags: [Supervisor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SortByParam'
 *       - $ref: '#/components/parameters/SortOrderParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *       - $ref: '#/components/parameters/codeParam'
 *       - $ref: '#/components/parameters/StoreIdParam'
 *       - $ref: '#/components/parameters/StoreNameParam'
 *       - $ref: '#/components/parameters/CreatedAtFromParam'
 *       - $ref: '#/components/parameters/CreatedAtToParam'
 *       - $ref: '#/components/parameters/CreatorIdParam'
 *       - $ref: '#/components/parameters/ExportParam'
 *     responses:
 *       200:
 *         description: Produk berhasil diambil
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

/**
 * @swagger
 * /api/supervisors/products/{id}:
 *   delete:
 *     summary: Delete a product from the supervisor's store
 *     tags: [Supervisor]
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
 *         description: Produk berhasil dihapus
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SupervisorDeleteProductResponse'
 *       404:
 *         description: Produk tidak ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/products/:id', deleteProduct);

module.exports = router;