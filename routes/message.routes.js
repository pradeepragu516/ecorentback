const express = require('express');
const router = express.Router();
const Message = require('../models/Message');

// @desc    Send a message
// @route   POST /api/messages
// @access  Public
router.post('/', async (req, res) => {
  try {
    const message = await Message.create(req.body);
    res.status(201).json({ success: true, data: message });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error  [ ]' });
  }
});

module.exports = router;
