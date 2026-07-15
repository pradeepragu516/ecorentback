const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { protect } = require('../middleware/auth');

router.get('/', protect, notificationController.getMyNotifications);
router.put('/:id/read', protect, notificationController.markRead);

module.exports = router;
