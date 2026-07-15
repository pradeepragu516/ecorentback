const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/review.controller');
const { protect, admin } = require('../middleware/auth');
const { validateReview } = require('../middleware/validation');

// Public route to get a vehicle's reviews
router.get('/vehicle/:vehicleId', reviewController.getVehicleReviews);

// Private customer review routes
router.post('/', protect, validateReview, reviewController.createReview);
router.put('/:id', protect, reviewController.updateReview);
router.delete('/:id', protect, reviewController.deleteReview);

// Admin-only moderation routes
router.get('/admin', protect, admin, reviewController.getAdminReviews);
router.put('/:id/moderate', protect, admin, reviewController.moderateReview);

module.exports = router;
