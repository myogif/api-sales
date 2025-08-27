const express = require('express');
const { authenticate } = require('../middlewares/auth');
const { requireManager } = require('../middlewares/role');
const {
  getDashboard,
  createSupervisorValidation,
  createSupervisor,
  deleteSupervisor,
  getSupervisors,
  getSalesUsers,
  getProducts,
  handleValidationErrors,
} = require('../controllers/manager.controller');

const router = express.Router();

// Apply authentication and manager role to all routes
router.use(authenticate, requireManager);

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
router.get('/dashboard', getDashboard);

/**
 * @swagger
 * /api/managers/supervisors:
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
 */
router.post('/supervisors', createSupervisorValidation, handleValidationErrors, createSupervisor);

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
router.delete('/supervisors/:id', deleteSupervisor);

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
router.get('/supervisors', getSupervisors);

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
router.get('/sales', getSalesUsers);

/**
 * @swagger
 * /api/managers/products:
 *   get:
 *     summary: Get all products
 *     tags: [Manager]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SortByParam'
 *       - $ref: '#/components/parameters/SortOrderParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *       - $ref: '#/components/parameters/SkuParam'
 *       - $ref: '#/components/parameters/StoreIdParam'
 *       - $ref: '#/components/parameters/PurchasedFromParam'
 *       - $ref: '#/components/parameters/PurchasedToParam'
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
router.get('/products', getProducts);

module.exports = router;