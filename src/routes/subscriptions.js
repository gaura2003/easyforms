const express = require('express');
const router = express.Router();
const subscriptionsController = require('../controllers/subscriptions');
const authMiddleware = require('../middleware/auth');

// Make sure all controller functions exist before using them
console.log('Available controller functions:', Object.keys(subscriptionsController));

// Protected routes (require authentication)
router.post('/create', authMiddleware, subscriptionsController.createSubscription);
router.post('/verify', authMiddleware, subscriptionsController.verifySubscription);
router.post('/cancel', authMiddleware, subscriptionsController.cancelSubscription);

// Make sure getSubscription is properly defined
if (typeof subscriptionsController.getSubscription === 'function') {
  router.get('/', authMiddleware, subscriptionsController.getSubscription);
} else {
  console.error('getSubscription is not a function!');
  // Provide a fallback handler
  router.get('/', authMiddleware, (req, res) => {
    res.status(501).json({ message: 'Subscription details not available' });
  });
}

// Webhook route (no authentication required)
router.post('/webhook', subscriptionsController.handleWebhook);

module.exports = router;
