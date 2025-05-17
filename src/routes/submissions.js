const express = require('express');
const router = express.Router({ mergeParams: true });
const submissionsController = require('../controllers/submissions');
const authMiddleware = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// Get all submissions for a form with pagination and filtering
router.get('/', submissionsController.getSubmissions);

// Get submission statistics
router.get('/stats', submissionsController.getSubmissionStats);

// Export submissions to CSV
router.get('/export', submissionsController.exportSubmissions);

// Get a specific submission
router.get('/:submissionId', submissionsController.getSubmissionById);

// Delete a specific submission
router.delete('/:submissionId', submissionsController.deleteSubmission);

// Delete all submissions for a form
router.delete('/', submissionsController.deleteAllSubmissions);

module.exports = router;
