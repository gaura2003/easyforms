const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const usersController = require('../controllers/users');

// Get current user
router.get('/me', authMiddleware, usersController.getCurrentUser);

module.exports = router;