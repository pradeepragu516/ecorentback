const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicle.controller');
const { protect, admin } = require('../middleware/auth');

// Public routes
router.get('/', vehicleController.getVehicles);
router.get('/recommendations', vehicleController.getRecommendations);
router.get('/:id', vehicleController.getVehicle);

// Admin-only vehicle CRUD routes
router.post('/', protect, admin, vehicleController.createVehicle);
router.put('/:id', protect, admin, vehicleController.updateVehicle);
router.delete('/:id', protect, admin, vehicleController.deleteVehicle);

module.exports = router;
