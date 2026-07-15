const express = require('express');
const router = express.Router();
const loyaltyController = require('../controllers/loyalty.controller');
const { protect } = require('../middleware/auth');

router.get('/points', protect, loyaltyController.getLoyaltyPoints);

module.exports = router;
