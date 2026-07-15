const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['car', 'scooter', 'bike', 'luxury', 'suv']
  },
  image: {
    type: String,
    required: true
  },
  images: [{
    type: String
  }],
  price: {
    type: Number,
    required: true,
    min: 0
  },
  range: {
    type: Number,
    required: true
  },
  speed: {
    type: Number,
    required: true
  },
  passengers: {
    type: Number,
    default: 4
  },
  batteryCapacity: {
    type: Number,
    default: 40
  },
  rating: {
    type: Number,
    default: 4.5,
    min: 0,
    max: 5
  },
  location: {
    type: String,
    required: true
  },
  coordinates: {
    lat: { type: Number, default: 12.9716 },
    lng: { type: Number, default: 77.5946 }
  },
  availability: {
    type: String,
    enum: ['Available', 'Reserved', 'In Use', 'Maintenance'],
    default: 'Available'
  },
  description: {
    type: String,
    required: true
  },
  features: [{
    type: String
  }],
  reviews: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      rating: { type: Number, required: true, min: 1, max: 5 },
      comment: String,
      createdAt: { type: Date, default: Date.now }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add text index for search functionality
vehicleSchema.index({
  name: 'text',
  type: 'text',
  location: 'text',
  description: 'text'
});

module.exports = mongoose.model('Vehicle', vehicleSchema);
