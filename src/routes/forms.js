const express = require('express');
const router = express.Router();
const formsController = require('../controllers/forms');
const authMiddleware = require('../middleware/auth');

// All routes should be protected with authMiddleware
router.use(authMiddleware);

// Get all forms for the current user
router.get('/', formsController.getAllForms);

// Get a specific form
router.get('/:formId', formsController.getFormById);

// Create a new form
router.post('/', formsController.createForm);

// Update a form
router.put('/:formId', formsController.updateForm);

// Delete a form
router.delete('/:formId', formsController.deleteForm);

module.exports = router;