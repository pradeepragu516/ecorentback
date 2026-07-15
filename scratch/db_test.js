const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
console.log('Testing connection to:', uri.split('@')[1]); // Log only host for privacy

const client = new MongoClient(uri, { 
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 5000
});

async function run() {
  try {
    console.log('Attempting low-level connection...');
    await client.connect();
    console.log('✅ SUCCESS: Native driver connected!');
    const admin = client.db('admin');
    const status = await admin.command({ serverStatus: 1 });
    console.log('✅ SUCCESS: Authenticated and received server status!');
  } catch (err) {
    console.error('❌ FAILED: Connection error details:');
    console.error('Name:', err.name);
    console.error('Message:', err.message);
    if (err.reason) console.error('Reason:', JSON.stringify(err.reason, null, 2));
  } finally {
    await client.close();
  }
}

run();
