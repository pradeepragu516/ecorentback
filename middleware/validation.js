const validateRegister = (req, res, next) => {
  const { username, email, password } = req.body;
  if (!username || username.trim().length < 3) {
    return res.status(400).json({ success: false, message: 'Username must be at least 3 characters long' });
  }
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
  }
  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide email and password' });
  }
  next();
};

const validateRental = (req, res, next) => {
  const { vehicleId, startDate, endDate, pickupLocation, returnLocation, totalPaid } = req.body;
  if (!vehicleId || !startDate || !endDate || !pickupLocation || !returnLocation || totalPaid === undefined) {
    return res.status(400).json({ success: false, message: 'Missing required rental reservation parameters' });
  }
  if (new Date(startDate) > new Date(endDate)) {
    return res.status(400).json({ success: false, message: 'Start date cannot be after end date' });
  }
  next();
};

const validateReview = (req, res, next) => {
  const { rating, comment } = req.body;
  if (rating === undefined || rating < 1 || rating > 5) {
    return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
  }
  if (!comment || comment.trim().length === 0) {
    return res.status(400).json({ success: false, message: 'Please write a comment for your review' });
  }
  next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validateRental,
  validateReview
};
