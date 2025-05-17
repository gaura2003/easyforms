const express = require('express');
const router = express.Router();
const subscriptionsController = require('../controllers/subscriptions');
const authMiddleware = require('../middleware/auth');

// Public routes
router.get('/plans', subscriptionsController.getSubscriptionPlans);
router.post('/webhook', subscriptionsController.handleWebhook);

// Protected routes (require authentication)
router.post('/create', authMiddleware, subscriptionsController.createSubscription);
router.post('/verify', authMiddleware, subscriptionsController.verifySubscription);
router.post('/cancel', authMiddleware, subscriptionsController.cancelSubscription);
router.get('/', authMiddleware, subscriptionsController.getSubscription);

module.exports = router;
