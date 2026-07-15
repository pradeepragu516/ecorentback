const Vehicle = require('../models/Vehicle');
const dbHandler = require('../data/dbHandler');
const recommendationService = require('../services/recommendation.service');
const reviewService = require('../services/review.service');

exports.getVehicles = async (req, res, next) => {
  try {
    if (req.isDbConnected) {
      const queryObj = { ...req.query };
      const excludeFields = ['page', 'sort', 'limit', 'fields', 'search'];
      excludeFields.forEach(el => delete queryObj[el]);

      // Clear empty queries
      Object.keys(queryObj).forEach(key => {
        if (queryObj[key] === '' || queryObj[key] === undefined || queryObj[key] === null) {
          delete queryObj[key];
        }
      });

      if (req.query.search) {
        queryObj.$text = { $search: req.query.search };
      }

      let queryStr = JSON.stringify(queryObj);
      queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
      
      let query = Vehicle.find(JSON.parse(queryStr));

      if (req.query.sort) {
        const sortBy = req.query.sort.split(',').join(' ');
        query = query.sort(sortBy);
      } else {
        query = query.sort('-createdAt');
      }

      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const startIndex = (page - 1) * limit;
      const vehicles = await query.skip(startIndex).limit(limit);

      res.json({
        success: true,
        count: vehicles.length,
        data: vehicles
      });
    } else {
      // Local fallback
      let vehicles = dbHandler.getCollection('vehicles');
      
      // Perform simple filtering if search/type query parameter exists
      if (req.query.type) {
        vehicles = vehicles.filter(v => v.type === req.query.type);
      }
      if (req.query.search) {
        const search = req.query.search.toLowerCase();
        vehicles = vehicles.filter(v => 
          v.name.toLowerCase().includes(search) || 
          v.location.toLowerCase().includes(search) || 
          v.description.toLowerCase().includes(search)
        );
      }
      
      res.json({
        success: true,
        count: vehicles.length,
        data: vehicles
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error retrieving vehicles' });
  }
};

exports.getVehicle = async (req, res, next) => {
  try {
    let vehicle;
    if (req.isDbConnected) {
      vehicle = await Vehicle.findById(req.params.id);
    } else {
      vehicle = dbHandler.findById('vehicles', req.params.id);
    }
    
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    res.json({ success: true, data: vehicle });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error retrieving vehicle' });
  }
};

exports.createVehicle = async (req, res, next) => {
  try {
    let vehicle;
    // Set default coordinates if not provided
    const body = { ...req.body };
    if (!body.coordinates) {
      body.coordinates = { lat: 12.9716, lng: 77.5946 }; // Default Bangalore coordinates
    }

    if (req.isDbConnected) {
      vehicle = await Vehicle.create(body);
    } else {
      vehicle = dbHandler.create('vehicles', body);
    }
    res.status(201).json({ success: true, data: vehicle });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Server error creating vehicle' });
  }
};

exports.updateVehicle = async (req, res, next) => {
  try {
    let updatedVehicle;
    if (req.isDbConnected) {
      const { name, type, image, price, range, speed, location, description, features, availability, passengers, batteryCapacity, coordinates } = req.body;
      const updateData = { name, type, image, price, range, speed, location, description, features, availability, passengers, batteryCapacity, coordinates };
      
      // Remove undefined keys
      Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

      updatedVehicle = await Vehicle.findByIdAndUpdate(
        req.params.id,
        { $set: updateData },
        { new: true, runValidators: true }
      );
    } else {
      updatedVehicle = dbHandler.update('vehicles', req.params.id, req.body);
    }

    if (!updatedVehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    res.json({ success: true, data: updatedVehicle });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Server error updating vehicle' });
  }
};

exports.deleteVehicle = async (req, res, next) => {
  try {
    if (req.isDbConnected) {
      const deletedVehicle = await Vehicle.findByIdAndDelete(req.params.id);
      if (!deletedVehicle) {
        return res.status(404).json({ success: false, message: 'Vehicle not found' });
      }
    } else {
      const result = dbHandler.delete('vehicles', req.params.id);
      if (!result) {
        return res.status(404).json({ success: false, message: 'Vehicle not found' });
      }
    }
    res.json({ success: true, data: {} });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Server error deleting vehicle' });
  }
};

// AI Vehicle Recommendations API
exports.getRecommendations = async (req, res, next) => {
  const { budget, distance, passengerCount, minRange } = req.query;

  try {
    const recommendations = await recommendationService.getRecommendations(req.isDbConnected, {
      budget,
      distance,
      passengerCount,
      minRange
    });
    res.json({ success: true, count: recommendations.length, data: recommendations });
  } catch (error) {
    console.error('RECOMMENDATIONS_ERROR:', error);
    res.status(500).json({ success: false, message: 'Server error generating recommendations' });
  }
};
