require('dotenv').config();
const mongoose = require('mongoose');
const Vehicle = require('./models/Vehicle');

async function checkDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');
    const count = await Vehicle.countDocuments();
    console.log(`Vehicle count: ${count}`);
    const vehicles = await Vehicle.find().limit(2);
    console.log('Sample vehicles:', JSON.stringify(vehicles, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkDB();
