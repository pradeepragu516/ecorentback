const mongoose = require('mongoose');

const rentalSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  pickupLocation: {
    type: String,
    required: true
  },
  returnLocation: {
    type: String,
    required: true
  },
  totalPaid: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'upcoming', 'completed', 'cancelled'],
    default: 'upcoming'
  },
  userRating: {
    type: Number,
    min: 1,
    max: 5
  },
  rated: {
    type: Boolean,
    default: false
  },
  isRated: {
    type: Boolean,
    default: false
  },
  pointsEarned: {
    type: Number,
    default: 100
  },
  pointsRedeemed: {
    type: Number,
    default: 0
  },
  discountAmount: {
    type: Number,
    default: 0
  },
  distanceTraveled: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Rental', rentalSchema);
