const express = require('express');
const { authenticate } = require('../middlewares/auth');
const { requireManager, requireManagerOrServiceCenter } = require('../middlewares/role');
const {
  getDashboard,
  createSupervisorValidation,
  createSupervisor,
  deleteSupervisor,
  getSupervisors,
  getSalesUsers,
  getProducts,
  getMonthlyProductSummary,
  handleValidationErrors,
} = require('../controllers/manager.controller');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * @swagger
 * /api/managers/dashboard:
 *   get:
 *     summary: Get manager dashboard
 *     tags: [Manager]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DashboardResponse'
 */
router.get('/dashboard', requireManagerOrServiceCenter, getDashboard);

/**
 * @swagger
 * /api/managers/add-supervisors:
 *   post:
 *     summary: Create a supervisor
 *     tags: [Manager]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSupervisorRequest'
 *     responses:
 *       201:
 *         description: Supervisor created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       400:
 *         description: Invalid input
 *       422:
 *         description: Store creation limit reached
 *         content:
 *           application/json:
 *             examples:
 *               storeLimitReached:
 *                 summary: Store creation limit reached
 *                 value:
 *                   status: false
 *                   message: Pembuatan Toko SUdah Mencapai Limit
 *                   data: null
 *               supervisorLimitReached:
 *                 summary: Supervisor limit reached for store
 *                 value:
 *                   status: false
 *                   message: Jumlah SPV SUdah Mencapai Limit
 *                   data: null
 */
router.post(
  '/add-supervisors',
  requireManager,
  createSupervisorValidation,
  handleValidationErrors,
  createSupervisor,
);

/**
 * @swagger
 * /api/managers/supervisors/{id}:
 *   delete:
 *     summary: Delete a supervisor
 *     tags: [Manager]
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
 *         description: Supervisor deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.delete('/supervisors/:id', requireManager, deleteSupervisor);

/**
 * @swagger
 * /api/managers/supervisors:
 *   get:
 *     summary: Get all supervisors
 *     tags: [Manager]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SortByParam'
 *       - $ref: '#/components/parameters/SortOrderParam'
 *     responses:
 *       200:
 *         description: Supervisors retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedUsersResponse'
 */
router.get('/supervisors', requireManagerOrServiceCenter, getSupervisors);

/**
 * @swagger
 * /api/managers/sales:
 *   get:
 *     summary: Get all sales users
 *     tags: [Manager]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SortByParam'
 *       - $ref: '#/components/parameters/SortOrderParam'
 *     responses:
 *       200:
 *         description: Sales users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedUsersResponse'
 */
router.get('/sales', requireManagerOrServiceCenter, getSalesUsers);

/**
 * @swagger
 * /api/managers/products/monthly-summary:
 *   get:
 *     summary: Get monthly product summary for a year
 *     tags: [Manager]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *           minimum: 1900
 *           maximum: 9999
 *         description: Year to summarise. Defaults to the current year when omitted.
 *     responses:
 *       200:
 *         description: Monthly product summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MonthlyProductSummaryResponse'
 */
router.get('/products/monthly-summary', requireManagerOrServiceCenter, getMonthlyProductSummary);

/**
 * @swagger
 * /api/managers/products:
 *   get:
 *     summary: Get all products
 *     description: Retrieve products with optional filters, including partial store name matches.
 *     tags: [Manager]
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
router.get('/products', requireManagerOrServiceCenter, getProducts);

module.exports = router;
