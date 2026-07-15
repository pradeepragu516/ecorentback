require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');

const seedUsers = [
  {
    username: 'admin',
    email: 'admin@ecorent.com',
    password: 'admin123',
    role: 'admin'
  },
  {
    username: 'user1',
    email: 'user1@example.com',
    password: 'password123'
  }
];

const seedVehicles = [
  {
    make: 'Tesla',
    model: 'Model 3',
    year: 2023,
    type: 'Electric',
    pricePerDay: 120,
    seats: 5,
    transmission: 'Automatic',
    fuelType: 'Electric',
    features: ['Autopilot', 'Premium Sound System', 'All-Wheel Drive'],
    image: 'tesla-model3.jpg',
    isAvailable: true,
    rating: 4.8,
    location: {
      address: '123 Green St',
      city: 'San Francisco',
      country: 'USA',
      coordinates: {
        lat: 37.7749,
        lng: -122.4194
      }
    }
  },
  {
    make: 'Toyota',
    model: 'Prius',
    year: 2022,
    type: 'Hybrid',
    pricePerDay: 75,
    seats: 5,
    transmission: 'Automatic',
    fuelType: 'Hybrid',
    features: ['Bluetooth', 'Backup Camera', 'Keyless Entry'],
    image: 'toyota-prius.jpg',
    isAvailable: true,
    rating: 4.5,
    location: {
      address: '456 Eco Ave',
      city: 'Portland',
      country: 'USA',
      coordinates: {
        lat: 45.5152,
        lng: -122.6784
      }
    }
  }
];

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Vehicle.deleteMany({});
    console.log('Cleared existing data');

    // Hash passwords and create users
    const createdUsers = [];
    for (const user of seedUsers) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      const newUser = await User.create({
        ...user,
        password: hashedPassword
      });
      createdUsers.push(newUser);
    }
    console.log('Created users');

    // Create vehicles with owner reference
    const adminUser = createdUsers.find(u => u.role === 'admin');
    const vehiclesWithOwner = seedVehicles.map(vehicle => ({
      ...vehicle,
      owner: adminUser._id
    }));
    
    await Vehicle.insertMany(vehiclesWithOwner);
    console.log('Created vehicles');

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
