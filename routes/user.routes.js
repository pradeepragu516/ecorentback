const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const dbHandler = require('../data/dbHandler');

// @desc    Get user favorites
// @route   GET /api/users/favorites
// @access  Private
router.get('/favorites', protect, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    let user;
    
    if (req.isDbConnected) {
      user = await User.findById(userId).populate('favorites');
    } else {
      user = dbHandler.findById('users', userId);
      if (user && user.favorites) {
        // Map vehicle IDs to full vehicle objects from local DB
        const vehicles = dbHandler.getCollection('vehicles');
        user.favorites = user.favorites.map(id => vehicles.find(v => v._id === id || v.id === id)).filter(Boolean);
      }
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: user.favorites || [] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Toggle vehicle favorite
// @route   POST /api/users/favorites/:vehicleId
// @access  Private
router.post('/favorites/:vehicleId', protect, async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const userId = req.user._id || req.user.id;
    console.log(`[DEBUG] Toggle Favorite: User ${userId} -> Vehicle ${vehicleId}`);
    let user;
    let message = '';

    if (req.isDbConnected) {
      user = await User.findById(userId);
      const isFavorite = user.favorites.includes(vehicleId);

      if (isFavorite) {
        user.favorites = user.favorites.filter(id => id.toString() !== vehicleId);
        message = 'Removed from favorites';
      } else {
        user.favorites.push(vehicleId);
        message = 'Added to favorites';
      }
      await user.save();
    } else {
      console.log(`[DEBUG] Local Mode: Finding user ${userId}`);
      user = dbHandler.findById('users', userId);
      
      if (!user) {
        console.error(`[ERROR] User ${userId} not found in local DB`);
        return res.status(404).json({ success: false, message: 'User not found in local storage' });
      }

      if (!user.favorites) user.favorites = [];
      
      const index = user.favorites.indexOf(vehicleId);
      if (index > -1) {
        user.favorites.splice(index, 1);
        message = 'Removed from favorites';
      } else {
        user.favorites.push(vehicleId);
        message = 'Added to favorites';
      }
      
      console.log(`[DEBUG] Updating user ${userId} favorites:`, user.favorites);
      dbHandler.update('users', userId, { favorites: user.favorites });
    }

    res.json({ success: true, message, favorites: user.favorites });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
