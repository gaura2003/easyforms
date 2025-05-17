const express = require('express');
const router = express.Router();
const subscriptionPlansController = require('../controllers/subscriptionPlans');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');

// Public routes (no authentication required)
router.get('/', subscriptionPlansController.getAllPlans);
router.get('/compare', subscriptionPlansController.comparePlans);
router.get('/:planId', subscriptionPlansController.getPlanById);

// Admin-only routes (require authentication and admin privileges)
router.post('/', authMiddleware, adminMiddleware, subscriptionPlansController.createPlan);
router.put('/:planId', authMiddleware, adminMiddleware, subscriptionPlansController.updatePlan);
router.delete('/:planId', authMiddleware, adminMiddleware, subscriptionPlansController.deletePlan);

module.exports = router;