const Vehicle = require('../models/Vehicle');
const dbHandler = require('../data/dbHandler');

class RecommendationService {
  async getRecommendations(isDbConnected, { budget, distance, passengerCount, minRange }) {
    let vehicles;
    if (isDbConnected) {
      vehicles = await Vehicle.find({ availability: 'Available' });
    } else {
      vehicles = dbHandler.getCollection('vehicles').filter(v => v.availability === 'Available' || v.availability === 'available');
    }

    const requestedBudget = Number(budget) || 200;
    const requestedDistance = Number(distance) || 50;
    const requestedPassengers = Number(passengerCount) || 1;
    const requestedMinRange = Number(minRange) || 50;

    const scoredVehicles = vehicles.map(vehicle => {
      // 1. Capacity Match (Critical for group size)
      const vehicleSeats = Number(vehicle.passengers) || (vehicle.type === 'car' || vehicle.type === 'suv' || vehicle.type === 'luxury' ? 4 : 1);
      let seatScore = 1.0;
      if (vehicleSeats < requestedPassengers) {
        seatScore = 0.1; // Heavy penalty if it can't fit the group
      } else if (vehicleSeats === requestedPassengers) {
        seatScore = 1.0; // Perfect fit
      } else {
        // Fits them but has extra seats
        seatScore = 0.8;
      }

      // 2. Budget Score
      const vehiclePrice = Number(vehicle.price);
      let priceScore = 1.0;
      if (vehiclePrice > requestedBudget) {
        // Penalize based on how much it exceeds the budget
        priceScore = Math.max(0.1, requestedBudget / vehiclePrice);
      } else {
        // Under budget, higher score if closer to budget or cheaper depending on perspective.
        // Let's reward cost-savings
        priceScore = 1.0 - (vehiclePrice / (requestedBudget * 2)); 
      }

      // 3. Battery Range Match
      const vehicleRange = Number(vehicle.range);
      let rangeScore = 1.0;
      if (vehicleRange < requestedDistance || vehicleRange < requestedMinRange) {
        // Excludes or heavily penalizes vehicles that can't cover the trip distance
        rangeScore = Math.max(0.05, vehicleRange / Math.max(requestedDistance, requestedMinRange));
      }

      // 4. Rating Score (Popularity booster)
      const vehicleRating = Number(vehicle.rating) || 4.5;
      const ratingScore = vehicleRating / 5.0;

      // Weighted calculation: capacity(35%), budget(30%), battery range(25%), ratings(10%)
      const finalScore = (seatScore * 0.35) + (priceScore * 0.30) + (rangeScore * 0.25) + (ratingScore * 0.10);

      // Return vehicle with match statistics
      return {
        ...JSON.parse(JSON.stringify(vehicle)),
        matchScore: Math.round(finalScore * 100),
        matchStats: {
          seatScore: Math.round(seatScore * 100),
          priceScore: Math.round(priceScore * 100),
          rangeScore: Math.round(rangeScore * 100),
          ratingScore: Math.round(ratingScore * 100)
        }
      };
    });

    // Filter out low matches (e.g. < 40%) and sort by matchScore desc
    return scoredVehicles
      .filter(item => item.matchScore >= 40)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5); // Return top 5 recommendations
  }
}

module.exports = new RecommendationService();
