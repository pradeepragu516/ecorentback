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
    name: 'Rivian R1S Adventure',
    type: 'suv',
    image: 'https://images.hgmsites.net/hug/2022-rivian-r1s_100818318_h.jpg',
    price: 150,
    range: 320,
    speed: 200,
    rating: 4.9,
    location: 'Airport Terminal 1',
    coordinates: {
      lat: 37.6213,
      lng: -122.3790
    },
    availability: 'Available',
    description: 'The Rivian R1S is an all-electric full-size SUV designed for adventures and rugged terrain.',
    features: ['Off-road modes', 'Panoramic Roof', 'Gear Guard Security System'],
    passengers: 7,
    batteryCapacity: 135
  },
  {
    name: 'Specialized Turbo Vado 5.0',
    type: 'bike',
    image: 'https://images.specialized.com/media/photo/image/318854-318854.jpg',
    price: 35,
    range: 90,
    speed: 45,
    rating: 4.7,
    location: 'City Center',
    coordinates: {
      lat: 37.7749,
      lng: -122.4194
    },
    availability: 'Available',
    description: 'The Specialized Turbo Vado 5.0 is a premium class-3 e-bike designed for daily commutes and urban transport.',
    features: ['Turbo Assist', 'Built-in Lights', 'Fenders & Rack'],
    passengers: 1,
    batteryCapacity: 710
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
