const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { protect, admin } = require('../middleware/auth');

router.get('/user', protect, analyticsController.getUserEcoAnalytics);
router.get('/admin', protect, admin, analyticsController.getAdminAnalytics);

module.exports = router;
