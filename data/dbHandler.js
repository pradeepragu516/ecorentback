const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'db.json');

const readDB = () => {
  try {
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading DB file:', error);
    return { users: [], vehicles: [], bookings: [] };
  }
};

const writeDB = (data) => {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing to DB file:', error);
    return false;
  }
};

module.exports = {
  getCollection: (name) => {
    const db = readDB();
    return db[name] || [];
  },
  insert: (collection, item) => {
    const db = readDB();
    if (!db[collection]) db[collection] = [];
    const newItem = { ...item, _id: Date.now().toString() };
    db[collection].push(newItem);
    writeDB(db);
    return newItem;
  },
  findOne: (collection, query) => {
    const data = readDB()[collection] || [];
    return data.find(item => {
      return Object.entries(query).every(([key, value]) => {
        if (value && typeof value === 'object' && value.$or) {
          return value.$or.some(q => Object.entries(q).every(([k, v]) => item[k] === v));
        }
        return item[key] === value;
      });
    });
  },
  findById: (collection, id) => {
    const data = readDB()[collection] || [];
    return data.find(item => item._id === id || item.id === id);
  },
  create: (collection, item) => {
    const db = readDB();
    if (!db[collection]) db[collection] = [];
    const newItem = { ...item, _id: Date.now().toString() };
    db[collection].push(newItem);
    writeDB(db);
    return newItem;
  },
  update: (collection, id, updates) => {
    const db = readDB();
    if (!db[collection]) return null;
    const index = db[collection].findIndex(item => item._id === id || item.id === id);
    if (index === -1) return null;
    
    db[collection][index] = { ...db[collection][index], ...updates };
    writeDB(db);
    return db[collection][index];
  },
  getAll: (collection) => {
    const db = readDB();
    return db[collection] || [];
  },
  delete: (collection, id) => {
    const db = readDB();
    if (!db[collection]) return false;
    const initialLength = db[collection].length;
    db[collection] = db[collection].filter(item => item._id !== id && item.id !== id);
    if (db[collection].length === initialLength) return false;
    writeDB(db);
    return true;
  },
  getSettings: () => {
    const db = readDB();
    return db.settings || {};
  },
  updateSettings: (updates) => {
    const db = readDB();
    db.settings = { ...(db.settings || {}), ...updates };
    writeDB(db);
    return db.settings;
  }
};
