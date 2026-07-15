const rentalService = require('../services/rental.service');
const Rental = require('../models/Rental');
const dbHandler = require('../data/dbHandler');

exports.getMyRentals = async (req, res, next) => {
  try {
    let rentals;
    if (req.isDbConnected) {
      rentals = await Rental.find({ user: req.user.id })
        .populate('vehicle')
        .sort('-createdAt');
    } else {
      rentals = dbHandler.getCollection('bookings').filter(r => r.user === req.user.id);
      rentals = rentals.map(r => {
        const vehicle = dbHandler.findById('vehicles', r.vehicle);
        return { ...r, vehicle };
      }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    
    res.json({ success: true, count: rentals.length, data: rentals });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error retrieving bookings' });
  }
};

exports.getAdminRentals = async (req, res, next) => {
  try {
    let rentals;
    if (req.isDbConnected) {
      rentals = await Rental.find()
        .populate('vehicle')
        .populate('user', 'username email')
        .sort('-createdAt');
    } else {
      rentals = dbHandler.getCollection('bookings');
      rentals = rentals.map(r => {
        const vehicle = dbHandler.findById('vehicles', r.vehicle);
        const user = dbHandler.findById('users', r.user);
        return { ...r, vehicle, user: user ? { username: user.username, email: user.email } : null };
      }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    
    res.json({ success: true, count: rentals.length, data: rentals });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error retrieving admin bookings' });
  }
};

exports.createRental = async (req, res, next) => {
  try {
    const rental = await rentalService.createRental(req.isDbConnected, req.user.id, req.body);
    res.status(201).json({ success: true, data: rental });
  } catch (error) {
    console.error('CREATE_RENTAL_ERROR:', error.message);
    res.status(400).json({ success: false, message: error.message || 'Server error creating booking' });
  }
};

exports.updateRental = async (req, res, next) => {
  try {
    let rental;
    if (req.isDbConnected) {
      rental = await Rental.findById(req.params.id);
      if (!rental) {
        return res.status(404).json({ success: false, message: 'Rental not found' });
      }
      
      if (rental.user.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(401).json({ success: false, message: 'Not authorized' });
      }
      
      rental = await Rental.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
      });
    } else {
      rental = dbHandler.findById('bookings', req.params.id);
      if (!rental) {
        return res.status(404).json({ success: false, message: 'Rental not found' });
      }
      if (rental.user !== req.user.id && req.user.role !== 'admin') {
        return res.status(401).json({ success: false, message: 'Not authorized' });
      }
      rental = dbHandler.update('bookings', req.params.id, req.body);
    }
    
    // Sync vehicle availability status in case status changed
    await rentalService.syncAllVehicleStatuses(req.isDbConnected);

    res.json({ success: true, data: rental });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error updating booking' });
  }
};

exports.cancelRental = async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';
    await rentalService.cancelRental(req.isDbConnected, req.params.id, req.user.id, isAdmin);
    res.json({ success: true, message: 'Booking cancelled successfully' });
  } catch (error) {
    console.error('CANCEL_RENTAL_ERROR:', error.message);
    res.status(400).json({ success: false, message: error.message || 'Server error cancelling booking' });
  }
};

exports.getRentalDetails = async (req, res, next) => {
  try {
    let rental;
    if (req.isDbConnected) {
      rental = await Rental.findById(req.params.id).populate('vehicle').populate('user', 'username email');
    } else {
      rental = dbHandler.findById('bookings', req.params.id);
      if (rental) {
        rental.vehicle = dbHandler.findById('vehicles', rental.vehicle);
        const user = dbHandler.findById('users', rental.user);
        rental.user = user ? { username: user.username, email: user.email } : null;
      }
    }

    if (!rental) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (rental.user && rental.user._id?.toString() !== req.user.id && req.user.role !== 'admin') {
      // Local check
      if (rental.user !== req.user.id) {
        return res.status(401).json({ success: false, message: 'Not authorized' });
      }
    }

    res.json({ success: true, data: rental });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error retrieving booking details' });
  }
};
