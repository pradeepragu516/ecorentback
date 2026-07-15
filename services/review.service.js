const Review = require('../models/Review');
const Vehicle = require('../models/Vehicle');
const dbHandler = require('../data/dbHandler');

class ReviewService {
  async recalculateVehicleRating(isDbConnected, vehicleId) {
    let reviews;
    if (isDbConnected) {
      reviews = await Review.find({ vehicle: vehicleId, isApproved: true });
    } else {
      reviews = dbHandler.getCollection('reviews').filter(r => r.vehicle === vehicleId && r.isApproved !== false);
    }

    const count = reviews.length;
    let average = 4.5; // Default rating if no reviews exist

    if (count > 0) {
      const sum = reviews.reduce((acc, item) => acc + item.rating, 0);
      average = Number((sum / count).toFixed(1));
    }

    if (isDbConnected) {
      await Vehicle.findByIdAndUpdate(vehicleId, { rating: average });
    } else {
      dbHandler.update('vehicles', vehicleId, { rating: average });
    }

    return { average, count };
  }

  async createReview(isDbConnected, userId, { vehicleId, rating, comment }) {
    let review;
    if (isDbConnected) {
      review = await Review.create({
        user: userId,
        vehicle: vehicleId,
        rating: Number(rating),
        comment,
        isApproved: true
      });
    } else {
      review = dbHandler.insert('reviews', {
        user: userId,
        vehicle: vehicleId,
        rating: Number(rating),
        comment,
        isApproved: true,
        createdAt: new Date().toISOString()
      });
    }

    // Recalculate rating
    await this.recalculateVehicleRating(isDbConnected, vehicleId);
    return review;
  }

  async updateReview(isDbConnected, reviewId, userId, { rating, comment }) {
    let review;
    if (isDbConnected) {
      review = await Review.findOne({ _id: reviewId, user: userId });
      if (!review) throw new Error('Review not found or unauthorized');
      
      if (rating !== undefined) review.rating = Number(rating);
      if (comment !== undefined) review.comment = comment;
      await review.save();
    } else {
      review = dbHandler.findById('reviews', reviewId);
      if (!review || review.user !== userId) throw new Error('Review not found or unauthorized');

      const updates = {};
      if (rating !== undefined) updates.rating = Number(rating);
      if (comment !== undefined) updates.comment = comment;

      review = dbHandler.update('reviews', reviewId, updates);
    }

    // Recalculate rating
    await this.recalculateVehicleRating(isDbConnected, review.vehicle);
    return review;
  }

  async deleteReview(isDbConnected, reviewId, userId, isAdmin = false) {
    let review;
    if (isDbConnected) {
      const query = isAdmin ? { _id: reviewId } : { _id: reviewId, user: userId };
      review = await Review.findOne(query);
      if (!review) throw new Error('Review not found or unauthorized');
      
      await Review.deleteOne({ _id: reviewId });
    } else {
      review = dbHandler.findById('reviews', reviewId);
      if (!review) throw new Error('Review not found');
      if (!isAdmin && review.user !== userId) throw new Error('Unauthorized');

      dbHandler.delete('reviews', reviewId);
    }

    // Recalculate rating
    await this.recalculateVehicleRating(isDbConnected, review.vehicle);
    return true;
  }

  async getVehicleReviews(isDbConnected, vehicleId) {
    if (isDbConnected) {
      const reviews = await Review.find({ vehicle: vehicleId, isApproved: true })
        .populate('user', 'username email avatar')
        .sort('-createdAt');
      
      return reviews;
    } else {
      const reviews = dbHandler.getCollection('reviews')
        .filter(r => r.vehicle === vehicleId && r.isApproved !== false);
      
      return reviews.map(r => {
        const user = dbHandler.findById('users', r.user);
        return {
          ...r,
          user: user ? { username: user.username, email: user.email, avatar: user.avatar } : null
        };
      }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  }

  async getVehicleReviewStats(isDbConnected, vehicleId) {
    let reviews;
    if (isDbConnected) {
      reviews = await Review.find({ vehicle: vehicleId, isApproved: true });
    } else {
      reviews = dbHandler.getCollection('reviews').filter(r => r.vehicle === vehicleId && r.isApproved !== false);
    }

    const totalReviews = reviews.length;
    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;

    reviews.forEach(r => {
      sum += r.rating;
      if (breakdown[r.rating] !== undefined) {
        breakdown[r.rating]++;
      }
    });

    const averageRating = totalReviews > 0 ? Number((sum / totalReviews).toFixed(1)) : 4.5;

    return {
      averageRating,
      totalReviews,
      breakdown
    };
  }

  async getAllReviewsAdmin(isDbConnected) {
    if (isDbConnected) {
      return await Review.find()
        .populate('user', 'username email')
        .populate('vehicle', 'name type')
        .sort('-createdAt');
    } else {
      const reviews = dbHandler.getCollection('reviews');
      return reviews.map(r => {
        const user = dbHandler.findById('users', r.user);
        const vehicle = dbHandler.findById('vehicles', r.vehicle);
        return {
          ...r,
          user: user ? { username: user.username, email: user.email } : null,
          vehicle: vehicle ? { name: vehicle.name, type: vehicle.type } : null
        };
      }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  }

  async moderateReview(isDbConnected, reviewId, isApproved) {
    let review;
    if (isDbConnected) {
      review = await Review.findByIdAndUpdate(reviewId, { isApproved }, { new: true });
    } else {
      review = dbHandler.update('reviews', reviewId, { isApproved });
    }

    if (review) {
      await this.recalculateVehicleRating(isDbConnected, review.vehicle);
    }
    return review;
  }
}

module.exports = new ReviewService();
