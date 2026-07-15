const Rental = require('../models/Rental');
const User = require('../models/User');
const Payment = require('../models/Payment');
const Vehicle = require('../models/Vehicle');
const dbHandler = require('../data/dbHandler');

class AnalyticsService {
  // Compute distance traveled based on duration if not set
  estimateDistance(rental) {
    if (rental.distanceTraveled && rental.distanceTraveled > 0) {
      return rental.distanceTraveled;
    }
    let hours = (new Date(rental.endDate) - new Date(rental.startDate)) / (1000 * 60 * 60);
    if (isNaN(hours) || hours < 0) {
      hours = 0;
    }
    // Estimate speed based on vehicle type
    let speed = 15; // default bike/scooter speed
    if (rental.vehicle) {
      const type = rental.vehicle.type;
      if (type === 'car' || type === 'suv' || type === 'luxury') {
        speed = 25; // average city speed for cars
      }
    }
    return Math.round(hours * speed);
  }


  calculateEcoMetrics(distance) {
    const petrolEmission = Number((distance * 0.22).toFixed(2)); // 0.22 kg CO2 / km
    const evEmission = Number((distance * 0.04).toFixed(2));     // 0.04 kg CO2 / km
    const co2Saved = Number((petrolEmission - evEmission).toFixed(2));
    const treesSaved = Number((co2Saved / 20).toFixed(2));        // 1 tree = 20 kg CO2 / year
    const fuelCostSaved = Number((distance * 0.10).toFixed(2));   // $0.10 saved per km
    
    return {
      petrolEmissions: petrolEmission,
      evEmissions: evEmission,
      co2Saved,
      treesSaved,
      fuelCostSaved
    };
  }

  async getUserEcoAnalytics(isDbConnected, userId) {
    let rentals;
    if (isDbConnected) {
      rentals = await Rental.find({ user: userId, status: 'completed' }).populate('vehicle');
    } else {
      rentals = dbHandler.getCollection('bookings')
        .filter(r => r.user === userId && r.status === 'completed');
      rentals = rentals.map(r => {
        const vehicle = dbHandler.findById('vehicles', r.vehicle);
        return { ...r, vehicle };
      });
    }

    let totalDistance = 0;
    rentals.forEach(r => {
      totalDistance += this.estimateDistance(r);
    });

    const ecoMetrics = this.calculateEcoMetrics(totalDistance);
    const totalTrips = rentals.length;
    const impactScore = Math.min(100, Math.round((ecoMetrics.co2Saved * 1.5) + (totalTrips * 3)));

    return {
      ...ecoMetrics,
      totalDistance,
      totalTrips,
      environmentalImpactScore: impactScore
    };
  }

  async getAdminAnalytics(isDbConnected) {
    let rentals, users, payments, vehicles;

    if (isDbConnected) {
      rentals = await Rental.find().populate('vehicle');
      users = await User.find();
      payments = await Payment.find();
      vehicles = await Vehicle.find();
    } else {
      rentals = dbHandler.getCollection('bookings').map(r => {
        const vehicle = dbHandler.findById('vehicles', r.vehicle);
        return { ...r, vehicle };
      });
      users = dbHandler.getCollection('users');
      payments = dbHandler.getCollection('payments');
      vehicles = dbHandler.getCollection('vehicles');
    }

    // 1. Overall stats cards
    const totalRevenue = payments
      .filter(p => p.status === 'Paid')
      .reduce((acc, p) => acc + p.amount, 0);
    
    const activeRentals = rentals.filter(r => r.status === 'active').length;
    
    let totalDistance = 0;
    rentals.filter(r => r.status === 'completed').forEach(r => {
      totalDistance += this.estimateDistance(r);
    });

    const co2Saved = Number((totalDistance * 0.18).toFixed(2));

    // 2. Monthly Revenue
    // Group payments by month (last 6 months)
    const monthlyRevenue = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
      monthlyRevenue[key] = 0;
    }

    payments.filter(p => p.status === 'Paid').forEach(p => {
      const date = new Date(p.createdAt);
      const key = `${months[date.getMonth()]} ${date.getFullYear().toString().slice(-2)}`;
      if (monthlyRevenue[key] !== undefined) {
        monthlyRevenue[key] += p.amount;
      }
    });

    // 3. User Growth (last 6 months)
    const userGrowth = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
      userGrowth[key] = 0;
    }

    users.forEach(u => {
      const date = new Date(u.createdAt);
      const key = `${months[date.getMonth()]} ${date.getFullYear().toString().slice(-2)}`;
      if (userGrowth[key] !== undefined) {
        userGrowth[key]++;
      }
    });

    // Accumulate user growth
    let userAcc = users.length - Object.values(userGrowth).reduce((a, b) => a + b, 0);
    Object.keys(userGrowth).forEach(key => {
      userAcc += userGrowth[key];
      userGrowth[key] = userAcc;
    });

    // 4. Booking Trends (completed vs cancelled vs upcoming)
    const bookingTrends = { upcoming: 0, active: 0, completed: 0, cancelled: 0 };
    rentals.forEach(r => {
      if (bookingTrends[r.status] !== undefined) {
        bookingTrends[r.status]++;
      }
    });

    // 5. Top Vehicles (by booking count)
    const vehicleBookingCounts = {};
    rentals.forEach(r => {
      if (r.vehicle) {
        const vId = r.vehicle._id || r.vehicle.id;
        vehicleBookingCounts[vId] = (vehicleBookingCounts[vId] || 0) + 1;
      }
    });

    const topVehicles = vehicles.map(v => {
      const vId = v._id || v.id;
      return {
        name: v.name,
        type: v.type,
        bookingsCount: vehicleBookingCounts[vId] || 0,
        revenue: rentals
          .filter(r => (r.vehicle?._id || r.vehicle?.id) === vId && r.status !== 'cancelled')
          .reduce((sum, r) => sum + r.totalPaid, 0)
      };
    })
    .sort((a, b) => b.bookingsCount - a.bookingsCount)
    .slice(0, 5);

    // 6. Carbon Saved Monthly
    const monthlyCarbonSaved = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
      monthlyCarbonSaved[key] = 0;
    }

    rentals.filter(r => r.status === 'completed').forEach(r => {
      const date = new Date(r.createdAt || r.startDate);
      const key = `${months[date.getMonth()]} ${date.getFullYear().toString().slice(-2)}`;
      if (monthlyCarbonSaved[key] !== undefined) {
        monthlyCarbonSaved[key] += Number((this.estimateDistance(r) * 0.18).toFixed(2));
      }
    });

    Object.keys(monthlyCarbonSaved).forEach(k => {
      monthlyCarbonSaved[k] = Number(monthlyCarbonSaved[k].toFixed(2));
    });

    return {
      cards: {
        totalRevenue,
        activeRentals,
        totalDistance,
        co2Saved
      },
      charts: {
        monthlyRevenue: {
          labels: Object.keys(monthlyRevenue),
          data: Object.values(monthlyRevenue)
        },
        userGrowth: {
          labels: Object.keys(userGrowth),
          data: Object.values(userGrowth)
        },
        bookingTrends: {
          labels: Object.keys(bookingTrends),
          data: Object.values(bookingTrends)
        },
        carbonSaved: {
          labels: Object.keys(monthlyCarbonSaved),
          data: Object.values(monthlyCarbonSaved)
        },
        topVehicles
      }
    };
  }
}

module.exports = new AnalyticsService();
