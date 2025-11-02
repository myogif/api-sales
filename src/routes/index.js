const express = require('express');
const authRoutes = require('./auth.routes');
const managerRoutes = require('./manager.routes');
const supervisorRoutes = require('./supervisor.routes');
const salesRoutes = require('./sales.routes');
const storeRoutes = require('./store.routes');

const router = express.Router();

// Health check for API
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is healthy',
    data: {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    },
  });
});

// Route modules
router.use('/auth', authRoutes);
router.use('/managers', managerRoutes);
router.use('/supervisors', supervisorRoutes);
router.use('/sales', salesRoutes);
router.use('/toko', storeRoutes);

module.exports = router;
