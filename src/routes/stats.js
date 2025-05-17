const express = require('express');
const router = express.Router();
const statsController = require('../controllers/stats');
const authMiddleware = require('../middleware/auth');

// Protect all stats routes with authentication
router.use(authMiddleware);

// Get dashboard statistics
router.get('/', statsController.getStats);

// Get detailed subscription statistics
router.get('/subscription', statsController.getSubscriptionStats);

// Get usage statistics
router.get('/usage', statsController.getUsageStats);

module.exports = router;
