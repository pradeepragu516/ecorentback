require('dotenv').config();
const mongoose = require('mongoose');
const Vehicle = require('./models/Vehicle');

const workingImages = {
  'Tesla Model 3': 'https://images.unsplash.com/photo-1560958089-b8a1929cea89',
  'Apollo Phantom V2': 'https://images.unsplash.com/photo-1558981806-ec527fa84c39',
  'Specialized Turbo Vado 5.0': 'https://images.unsplash.com/photo-1571068316344-75bc76f77891',
  'Tesla Model Y': 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a',
  'Rivian R1S Adventure': 'https://images.unsplash.com/photo-1669062330756-32432924375b',
  'Zero SR/F': 'https://images.unsplash.com/photo-1558981224-2c8d5f308472'
};

async function updateImages() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');
    
    for (const [name, url] of Object.entries(workingImages)) {
      const fullUrl = `${url}?auto=format&fit=crop&q=80&w=1000`;
      await Vehicle.updateOne(
        { name: name },
        { 
          $set: { 
            image: fullUrl,
            images: [fullUrl] 
          } 
        }
      );
      console.log(`Updated images for ${name}`);
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

updateImages();
