const express = require('express');
const router = express.Router();
const subscriptionHistoryController = require('../controllers/subscriptionHistory');
const authMiddleware = require('../middleware/auth');

// Protect all routes with authentication
router.use(authMiddleware);

// Get subscription history for the authenticated user
router.get('/', subscriptionHistoryController.getSubscriptionHistory);

// Add a new subscription history entry
router.post('/', subscriptionHistoryController.addSubscriptionHistoryEntry);

module.exports = router;