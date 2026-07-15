const analyticsService = require('../services/analytics.service');

exports.getUserEcoAnalytics = async (req, res, next) => {
  console.log('--- GET USER ECO ANALYTICS REQUEST ---');
  console.log('User ID from token:', req?.user?.id);
  console.log('Database Connected Status:', req.isDbConnected);
  try {
    const stats = await analyticsService.getUserEcoAnalytics(req.isDbConnected, req.user.id);
    console.log('Successfully generated stats:', stats);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('ERROR IN getUserEcoAnalytics:', error);
    res.status(500).json({ success: false, message: 'Server error generating eco statistics' });
  }
};


exports.getAdminAnalytics = async (req, res, next) => {
  try {
    const data = await analyticsService.getAdminAnalytics(req.isDbConnected);
    res.json({ success: true, data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error generating admin dashboard analytics' });
  }
};
