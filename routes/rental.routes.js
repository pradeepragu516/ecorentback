const express = require('express');
const router = express.Router();
const rentalController = require('../controllers/rental.controller');
const { protect, admin } = require('../middleware/auth');
const { validateRental } = require('../middleware/validation');

// Private customer routes
router.get('/', protect, rentalController.getMyRentals);
router.get('/:id', protect, rentalController.getRentalDetails);
router.post('/', protect, validateRental, rentalController.createRental);
router.put('/:id', protect, rentalController.updateRental);
router.post('/:id/cancel', protect, rentalController.cancelRental);

// Admin rental management routes
router.get('/admin/all', protect, admin, rentalController.getAdminRentals);

module.exports = router;
