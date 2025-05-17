const express = require('express');
const router = express.Router();
const subscriptionsController = require('../controllers/subscriptions');
const authMiddleware = require('../middleware/auth');

// Protected routes (require authentication)
router.post('/create', authMiddleware, subscriptionsController.createSubscription);
router.post('/verify', authMiddleware, subscriptionsController.verifySubscription);
router.post('/cancel', authMiddleware, subscriptionsController.cancelSubscription);
router.get('/', authMiddleware, subscriptionsController.getSubscription);
router.post('/downgrade', authMiddleware, subscriptionsController.downgradeSubscription);

// Plans routes (public)
router.get('/plans', subscriptionsController.getPlans);

// Webhook route (no authentication required)
router.post('/webhook', subscriptionsController.handleWebhook);

module.exports = router;
