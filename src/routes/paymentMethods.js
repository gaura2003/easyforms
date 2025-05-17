const express = require('express');
const router = express.Router();
const paymentMethodsController = require('../controllers/paymentMethods');
const authMiddleware = require('../middleware/auth');

// Protect all routes with authentication
router.use(authMiddleware);

// Get all payment methods for the authenticated user
router.get('/', paymentMethodsController.getPaymentMethods);

// Add a new payment method
router.post('/', paymentMethodsController.addPaymentMethod);

// Set a payment method as default
router.put('/:paymentMethodId/default', paymentMethodsController.setDefaultPaymentMethod);

// Delete a payment method
router.delete('/:paymentMethodId', paymentMethodsController.deletePaymentMethod);

module.exports = router;