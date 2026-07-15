const Rental = require('../models/Rental');
const Vehicle = require('../models/Vehicle');
const dbHandler = require('../data/dbHandler');
const loyaltyService = require('./loyalty.service');

class RentalService {
  async checkOverlappingBooking(isDbConnected, vehicleId, startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isDbConnected) {
      const overlapping = await Rental.findOne({
        vehicle: vehicleId,
        status: { $ne: 'cancelled' },
        $and: [
          { startDate: { $lte: end } },
          { endDate: { $gte: start } }
        ]
      });
      return !!overlapping;
    } else {
      const bookings = dbHandler.getCollection('bookings');
      const overlapping = bookings.find(b => {
        if (b.vehicle !== vehicleId || b.status === 'cancelled') return false;
        const bStart = new Date(b.startDate);
        const bEnd = new Date(b.endDate);
        return bStart <= end && bEnd >= start;
      });
      return !!overlapping;
    }
  }

  async syncAllVehicleStatuses(isDbConnected) {
    const now = new Date();
    let vehicles, rentals;

    if (isDbConnected) {
      vehicles = await Vehicle.find();
      rentals = await Rental.find({ status: { $in: ['active', 'upcoming'] } });
    } else {
      vehicles = dbHandler.getCollection('vehicles');
      rentals = dbHandler.getCollection('bookings').filter(r => ['active', 'upcoming'].includes(r.status));
    }

    for (const vehicle of vehicles) {
      const vehicleId = vehicle._id ? vehicle._id.toString() : vehicle.id.toString();
      
      // Skip status synchronization if vehicle is currently set to Maintenance by admin
      if (vehicle.availability === 'Maintenance') {
        continue;
      }

      // Find rentals for this vehicle active right now or starting soon
      const vehicleRentals = rentals.filter(r => {
        const vId = r.vehicle ? (r.vehicle._id ? r.vehicle._id.toString() : r.vehicle.toString()) : '';
        return vId === vehicleId;
      });

      let newStatus = 'Available';
      
      const activeRental = vehicleRentals.find(r => {
        const start = new Date(r.startDate);
        const end = new Date(r.endDate);
        return now >= start && now <= end;
      });

      if (activeRental) {
        newStatus = 'In Use';
        // Auto transition rental status to active if it's currently upcoming
        if (activeRental.status === 'upcoming') {
          if (isDbConnected) {
            await Rental.findByIdAndUpdate(activeRental._id, { status: 'active' });
          } else {
            dbHandler.update('bookings', activeRental._id || activeRental.id, { status: 'active' });
          }
        }
      } else {
        // Check if there is an upcoming booking starting within the next 2 hours
        const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
        const upcomingRental = vehicleRentals.find(r => {
          const start = new Date(r.startDate);
          return start > now && start <= twoHoursFromNow;
        });

        if (upcomingRental) {
          newStatus = 'Reserved';
        }
      }

      if (vehicle.availability !== newStatus) {
        if (isDbConnected) {
          await Vehicle.findByIdAndUpdate(vehicleId, { availability: newStatus });
        } else {
          dbHandler.update('vehicles', vehicleId, { availability: newStatus });
        }
      }
    }
  }

  async createRental(isDbConnected, userId, rentalData) {
    const { vehicleId, startDate, endDate, pickupLocation, returnLocation, totalPaid, discountAmount, pointsRedeemed } = rentalData;

    // 1. Check overlapping booking
    const hasOverlap = await this.checkOverlappingBooking(isDbConnected, vehicleId, startDate, endDate);
    if (hasOverlap) {
      throw new Error('Vehicle is already booked for the selected dates');
    }

    // 2. Fetch vehicle details
    let vehicle;
    if (isDbConnected) {
      vehicle = await Vehicle.findById(vehicleId);
    } else {
      vehicle = dbHandler.findById('vehicles', vehicleId);
    }

    if (!vehicle) {
      throw new Error('Vehicle not found');
    }

    // 3. Deduct points if user redeemed any
    if (pointsRedeemed && pointsRedeemed > 0) {
      await loyaltyService.redeemPoints(isDbConnected, userId, pointsRedeemed);
    }

    // 4. Create the booking entry (starts as pending payment status or upcoming)
    let rental;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();
    
    // Default initial status
    let initialStatus = 'upcoming';
    if (now >= start && now <= end) {
      initialStatus = 'active';
    }

    if (isDbConnected) {
      rental = await Rental.create({
        user: userId,
        vehicle: vehicleId,
        startDate,
        endDate,
        pickupLocation,
        returnLocation,
        totalPaid,
        discountAmount: discountAmount || 0,
        pointsRedeemed: pointsRedeemed || 0,
        pointsEarned: 100,
        status: initialStatus
      });
    } else {
      rental = dbHandler.insert('bookings', {
        user: userId,
        vehicle: vehicleId,
        startDate,
        endDate,
        pickupLocation,
        returnLocation,
        totalPaid,
        discountAmount: discountAmount || 0,
        pointsRedeemed: pointsRedeemed || 0,
        pointsEarned: 100,
        status: initialStatus,
        createdAt: new Date().toISOString()
      });
    }

    // 5. Update vehicle status
    await this.syncAllVehicleStatuses(isDbConnected);

    return rental;
  }

  async cancelRental(isDbConnected, rentalId, userId, isAdmin = false) {
    let rental;
    if (isDbConnected) {
      rental = await Rental.findById(rentalId);
    } else {
      rental = dbHandler.findById('bookings', rentalId);
    }

    if (!rental) {
      throw new Error('Rental not found');
    }

    // Authorization check
    if (!isAdmin && rental.user.toString() !== userId.toString()) {
      throw new Error('Not authorized to cancel this booking');
    }

    if (rental.status === 'completed' || rental.status === 'cancelled') {
      throw new Error(`Cannot cancel a rental that is already ${rental.status}`);
    }

    // Update rental status
    if (isDbConnected) {
      await Rental.findByIdAndUpdate(rentalId, { status: 'cancelled' });
    } else {
      dbHandler.update('bookings', rentalId, { status: 'cancelled' });
    }

    // Refund loyalty points if redeemed
    if (rental.pointsRedeemed > 0) {
      await loyaltyService.refundPoints(
        isDbConnected,
        rental.user,
        0, // pointsEarned refund (don't subtract since booking was cancelled before payment finalization or completion)
        rental.pointsRedeemed // refund pointsRedeemed
      );
    }

    // Update vehicle availability
    await this.syncAllVehicleStatuses(isDbConnected);
    return true;
  }
}

module.exports = new RentalService();
