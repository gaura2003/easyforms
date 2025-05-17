const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');

// Create routes for registration and login
router.post('/register', authController.register);
router.post('/login', authController.login);

module.exports = router;
