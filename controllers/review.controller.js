const reviewService = require('../services/review.service');

exports.createReview = async (req, res, next) => {
  const { vehicleId, rating, comment } = req.body;

  try {
    const review = await reviewService.createReview(req.isDbConnected, req.user.id, {
      vehicleId,
      rating,
      comment
    });
    res.status(201).json({ success: true, data: review });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error saving review' });
  }
};

exports.updateReview = async (req, res, next) => {
  try {
    const review = await reviewService.updateReview(req.isDbConnected, req.params.id, req.user.id, req.body);
    res.json({ success: true, data: review });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, message: error.message || 'Server error updating review' });
  }
};

exports.deleteReview = async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';
    await reviewService.deleteReview(req.isDbConnected, req.params.id, req.user.id, isAdmin);
    res.json({ success: true, message: 'Review deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, message: error.message || 'Server error deleting review' });
  }
};

exports.getVehicleReviews = async (req, res, next) => {
  try {
    const reviews = await reviewService.getVehicleReviews(req.isDbConnected, req.params.vehicleId);
    const stats = await reviewService.getVehicleReviewStats(req.isDbConnected, req.params.vehicleId);
    
    res.json({
      success: true,
      count: reviews.length,
      stats,
      data: reviews
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error retrieving reviews' });
  }
};

exports.getAdminReviews = async (req, res, next) => {
  try {
    const reviews = await reviewService.getAllReviewsAdmin(req.isDbConnected);
    res.json({ success: true, count: reviews.length, data: reviews });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error retrieving admin reviews' });
  }
};

exports.moderateReview = async (req, res, next) => {
  const { isApproved } = req.body;

  try {
    const review = await reviewService.moderateReview(req.isDbConnected, req.params.id, isApproved);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }
    res.json({ success: true, data: review });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error moderating review' });
  }
};
