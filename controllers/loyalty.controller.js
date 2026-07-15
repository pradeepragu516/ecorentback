const loyaltyService = require('../services/loyalty.service');

exports.getLoyaltyPoints = async (req, res, next) => {
  try {
    const pointsData = await loyaltyService.getPoints(req.isDbConnected, req.user.id);
    res.json({ success: true, data: pointsData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error retrieving loyalty points' });
  }
};
