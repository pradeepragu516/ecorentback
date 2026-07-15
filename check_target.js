require('dotenv').config();
const mongoose = require('mongoose');
const Vehicle = require('./models/Vehicle');

async function checkDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');
    const vehicles = await Vehicle.find({ name: { $in: ["Specialized Turbo Vado 5.0", "Rivian R1S Adventure"] } });
    console.log('Target vehicles:', JSON.stringify(vehicles, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkDB();
