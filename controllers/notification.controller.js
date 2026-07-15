const notificationService = require('../services/notification.service');

exports.getMyNotifications = async (req, res, next) => {
  try {
    const list = await notificationService.getUserNotifications(req.isDbConnected, req.user.id);
    res.json({ success: true, count: list.length, data: list });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error retrieving notifications' });
  }
};

exports.markRead = async (req, res, next) => {
  try {
    const updated = await notificationService.markAsRead(
      req.isDbConnected,
      req.params.id,
      req.user.id
    );
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Notification not found or unauthorized' });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error updating notification status' });
  }
};
