const express = require('express');
const { authenticate } = require('../middlewares/auth');
const { requireManager, requireManagerOrServiceCenter } = require('../middlewares/role');
const { checkStoreLimit, getAllStores, createStore, deleteStore } = require('../controllers/store.controller');

const router = express.Router();

router.use(authenticate);

/**
 * @swagger
 * /api/toko:
 *   get:
 *     summary: Ambil semua toko tanpa pagination
 *     tags: [Store]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Data toko berhasil diambil
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
 *                   example: Data toko berhasil diambil
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Store'
 */
router.get('/', getAllStores);

/**
 * @swagger
 * /api/toko/check-limit:
 *   get:
 *     summary: Periksa batas pembuatan toko
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

/**
 * @swagger
 * /api/toko:
 *   post:
 *     summary: Buat toko baru
 *     tags: [Store]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - kode_toko
 *               - name
 *             properties:
 *               kode_toko:
 *                 type: string
 *                 example: TOKO001
 *               name:
 *                 type: string
 *                 example: Main Store
 *               address:
 *                 type: string
 *                 example: "123 Main Street, City Center"
 *               phone:
 *                 type: string
 *                 example: "080111111111"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: main@store.com
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Toko berhasil dibuat
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
 *                   example: Toko berhasil dibuat
 *                 data:
 *                   $ref: '#/components/schemas/Store'
 */
 router.post('/', requireManager, createStore);

/**
 * @swagger
 * /api/toko/{id}:
 *   delete:
 *     summary: Hapus toko
 *     tags: [Store]
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
 *         description: Toko berhasil dihapus
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
 *                   example: Toko berhasil dihapus
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: Toko berhasil dihapus
 *       404:
 *         description: Toko tidak ditemukan
 */
router.delete('/:id', requireManager, deleteStore);

module.exports = router;
