const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const dbHandler = require('../data/dbHandler');

// @desc    Get site settings
// @route   GET /api/settings
// @access  Public
router.get('/', (req, res) => {
  try {
    const settings = dbHandler.getSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Update site settings
// @route   PUT /api/settings
// @access  Private/Admin
router.put('/', protect, admin, (req, res) => {
  try {
    const updatedSettings = dbHandler.updateSettings(req.body);
    res.json({ success: true, data: updatedSettings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
