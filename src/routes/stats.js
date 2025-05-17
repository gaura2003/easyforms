const express = require('express');
const router = express.Router();
const statsController = require('../controllers/stats');
const authMiddleware = require('../middleware/auth');

// Protect all stats routes with authentication
router.use(authMiddleware);

// Get dashboard statistics
router.get('/', statsController.getStats);

module.exports = router;