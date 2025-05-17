const express = require('express');
const router = express.Router();
const paymentsController = require('../controllers/payments');
const authMiddleware = require('../middleware/auth');

// Protect all routes with authentication
router.use(authMiddleware);

// Get payment history for the authenticated user
router.get('/', paymentsController.getPaymentHistory);

// Get details of a specific payment
router.get('/:paymentId', paymentsController.getPaymentDetails);

// Create a new payment record
router.post('/', paymentsController.createPayment);

// Update payment status
router.put('/:paymentId/status', paymentsController.updatePaymentStatus);

module.exports = router;